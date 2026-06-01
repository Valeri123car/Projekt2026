const dashboardQuerySchema = {
  type: "object",
  properties: {
    fk_uporabnik: { type: "integer" },
    fk_stranka: { type: "integer" },
    od: { type: "string", format: "date" },
    do: { type: "string", format: "date" },
  },
};

const protectedOnly = async (request, reply) => {
  if (request.user.vloga !== 2) {
    return reply.code(403).send({ error: "Dostop zavrnjen" });
  }
};

function buildDashboardFilters(query) {
  const { fk_uporabnik, fk_stranka, od, do: do_ } = query;
  const whereVoznje = {};
  const whereUrnik = {};

  if (fk_uporabnik) {
    whereVoznje.fk_uporabnik = parseInt(fk_uporabnik);
    whereUrnik.fk_uporabnik = parseInt(fk_uporabnik);
  }

  if (fk_stranka) {
    whereUrnik.fk_stranka = parseInt(fk_stranka);
  }

  if (od || do_) {
    whereVoznje.zacetek = {};
    whereUrnik.datum = {};
 
    if (od) {
      whereVoznje.zacetek.gte = new Date(od);
      whereUrnik.datum.gte = new Date(od);
    }
 
    if (do_) {
      const toDate = new Date(do_);
      toDate.setHours(23, 59, 59, 999);
      whereVoznje.zacetek.lte = toDate;
      whereUrnik.datum.lte = toDate;
    }
  }

  return {
    whereVoznje,
    whereUrnik,
    fk_uporabnik: fk_uporabnik ? parseInt(fk_uporabnik) : null,
  };
}

function calculateRideHours(ride) {
  if (!ride.zacetek || !ride.konc) return 0;
  return (new Date(ride.konc) - new Date(ride.zacetek)) / 1000 / 3600;
}

function isCurrentlyDriving(rides) {
  const now = Date.now();
  const THRESHOLD_MS = 30 * 60 * 1000;
  return rides.some((ride) => {
    if (!ride.konc) return true; 
    return now - new Date(ride.konc).getTime() < THRESHOLD_MS;
  });
}

function buildTahografFilters(query) {
  const { fk_uporabnik, od, do: do_ } = query;
  const where = {};

  if (fk_uporabnik) {
    where.fk_uporabnik = parseInt(fk_uporabnik);
  }

  if (od || do_) {
    where.zacetek = {};

    if (od) {
      where.zacetek.gte = new Date(od);
    }

    if (do_) {
      const toDate = new Date(do_);
      toDate.setHours(23, 59, 59, 999);
      where.zacetek.lte = toDate;
    }
  }

  return where;
}

function getTahografDurationMinutes(zapis) {
  if (typeof zapis.trajanje_min === "number") {
    return zapis.trajanje_min;
  }

  if (!zapis.zacetek || !zapis.konec) {
    return 0;
  }

  return Math.max(
    0,
    Math.round((new Date(zapis.konec) - new Date(zapis.zacetek)) / 60000),
  );
}

async function loadTahografStatistics(app, query) {
  const zapisi = await app.prisma.tahografZapis.findMany({
    where: buildTahografFilters(query),
    select: {
      zacetek: true,
      konec: true,
      fk_uporabnik: true,
      trajanje_min: true,
    },
  });

  const totalMinutes = zapisi.reduce(
    (sum, zapis) => sum + getTahografDurationMinutes(zapis),
    0,
  );
  const driverIds = new Set(zapisi.map((zapis) => zapis.fk_uporabnik));
  const currentlyDrivingIds = new Set(
    zapisi
      .filter((zapis) => !zapis.konec)
      .map((zapis) => zapis.fk_uporabnik),
  );

  const totalHours = Math.round((totalMinutes / 60) * 100) / 100;

  return {
    totalHours,
    totalKm: 0,
    currentlyDriving: currentlyDrivingIds.size,
    activeDrivers: driverIds.size,
    totalDrivers: driverIds.size,
    skupne_ure: totalHours,
    trenutno_vozi: currentlyDrivingIds.size,
    aktivni_vozniki: driverIds.size,
    skupaj_vozniki: driverIds.size,
  };
} 
function formatRecentRide(ride) {
  const hours = calculateRideHours(ride);
  const km = Math.max(0, Math.round(hours * 62));
  const driver =
    `${ride.uporabnik?.ime || ""} ${ride.uporabnik?.priimek || ""}`.trim() ||
    "Neznani voznik";
  const completedAt = ride.konc ? new Date(ride.konc) : null;
  const driving = !ride.konc || (completedAt && Date.now() - completedAt.getTime() < 30 * 60 * 1000);
 
  return {
    id: `VOZ-${ride.id_voznja}`,
    driver,
    km,
    hours: `${hours.toFixed(2)}h`,
    consumption: Number((km / Math.max(hours, 1) / 2.2).toFixed(1)),
    status: driving ? "v_voznji" : "počitek",
    location: ride.relacija || ride.stranka || "Neznano",
  };
}
 
function buildAlerts({ voznje, urniki, statistics }) {
  const alerts = [];
 
  const longestRide = voznje.reduce((max, ride) => {
    const h = calculateRideHours(ride);
    return h > max ? h : max;
  }, 0);
 
  const unpaidRevenue = urniki
    .filter((u) => !u.placano)
    .reduce((sum, u) => sum + (u.cena || 0), 0);
 
  if (longestRide >= 8) {
    alerts.push({
      id: 1,
      type: "warning",
      title: "Prekoračitev časa vožnje",
      description: `Najdaljša vožnja je trajala ${longestRide.toFixed(1)} h`,
      icon: "warning",
    });
  }
 
  if (unpaidRevenue > 0) {
    alerts.push({
      id: 2,
      type: "info",
      title: "Neplačani urniki",
      description: `Neplačani znesek znaša €${unpaidRevenue.toFixed(2)}`,
      icon: "receipt_long",
    });
  }
 
  alerts.push({
    id: 3,
    type: "success",
    title: "Aktivni vozniki",
    description: `${statistics.currentlyDriving} voznikov trenutno vozi`,
    icon: "check_circle",
  });
 
  return alerts;
}
 
async function loadDashboardData(app, query) {
  const { whereVoznje, whereUrnik } = buildDashboardFilters(query);
 
  const [voznje, urniki, vozniki, racuni] = await Promise.all([
    app.prisma.voznja.findMany({
      where: whereVoznje,
      orderBy: { zacetek: "desc" },
      include: {
        uporabnik: { select: { ime: true, priimek: true } },
      },
    }),
    app.prisma.urnik.findMany({
      where: whereUrnik,
      include: {
        stranka: { select: { naziv: true } },
        uporabnik: { select: { ime: true, priimek: true } },
      },
    }),
    app.prisma.uporabnik.findMany({
      where: { dostop: 1 },
      select: { id_uporabnik: true, ime: true, priimek: true },
    }),
    app.prisma.racun.findMany({
      where: query.fk_uporabnik
        ? { fk_uporabnik: parseInt(query.fk_uporabnik) }
        : {},
    }),
  ]);
 
  const actualDriverIds = [...new Set(voznje.map((r) => r.fk_uporabnik))];
  const ridesByDriver = actualDriverIds.reduce((acc, id) => {
    acc[id] = voznje.filter((r) => r.fk_uporabnik === id);
    return acc;
  }, {});
 
  const actualDrivers = vozniki.filter((v) =>
    actualDriverIds.includes(v.id_uporabnik)
  );
 
  const currentlyDrivingIds = new Set(
    actualDriverIds.filter((id) => isCurrentlyDriving(ridesByDriver[id]))
  );
 
  const activeDriverIds = new Set(
    voznje
      .filter(
        (r) =>
          Date.now() - new Date(r.zacetek).getTime() < 7 * 24 * 60 * 60 * 1000
      )
      .map((r) => r.fk_uporabnik)
  );
 
  const totalHours = voznje.reduce((acc, r) => acc + calculateRideHours(r), 0);
  const recentRides = voznje.slice(0, 5).map(formatRecentRide);
  const totalKm = voznje.reduce((acc, r) => acc + Math.max(0, Math.round(calculateRideHours(r) * 62)), 0);
  const totalRevenue = urniki.reduce((acc, u) => acc + (u.cena || 0), 0);
  const placaniPrihodki = urniki
    .filter((u) => u.placano)
    .reduce((acc, u) => acc + (u.cena || 0), 0);
  const skupnaPlaca = racuni.reduce((acc, r) => acc + (r.placa || 0), 0);
 
  const statistics = {
    totalHours: Math.round(totalHours * 100) / 100,
    totalKm,
    totalRevenue: Math.round(totalRevenue * 100) / 100,
    currentlyDriving: currentlyDrivingIds.size,
    activeDrivers: activeDriverIds.size,
    totalDrivers: actualDrivers.length,
  };
 
  const voznjePoVozniku = actualDrivers.map((voznik) => {
    const rides = ridesByDriver[voznik.id_uporabnik] || [];
    const ure = rides.reduce((acc, r) => acc + calculateRideHours(r), 0);
    return {
      id: voznik.id_uporabnik,
      voznik: `${voznik.ime} ${voznik.priimek}`,
      st_vozenj: rides.length,
      skupne_ure: Math.round(ure * 100) / 100,
      trenutno_vozi: currentlyDrivingIds.has(voznik.id_uporabnik),
    };
  });
 
  const prihodkiPoStranki = urniki.reduce((acc, u) => {
    const naziv = u.stranka?.naziv || "Neznana stranka";
    if (!acc[naziv]) acc[naziv] = 0;
    acc[naziv] += u.cena || 0;
    return acc;
  }, {});
 
  const prihodkiPoMesecih = urniki.reduce((acc, u) => {
    const mesec = new Date(u.datum).toISOString().slice(0, 7);
    if (!acc[mesec]) acc[mesec] = 0;
    acc[mesec] += u.cena || 0;
    return acc;
  }, {});
 
  const alerts = buildAlerts({ voznje, urniki, statistics });
 
  return {
    statistics,
    recentRides,
    alerts,
    dashboard: {
      povzetek: {
        skupne_ure: Math.round(totalHours * 100) / 100,
        skupni_km: totalKm,
        st_vozenj: voznje.length,
        st_urnikov: urniki.length,
        skupni_prihodki: Math.round(totalRevenue * 100) / 100,
        placani_prihodki: Math.round(placaniPrihodki * 100) / 100,
        neplacani_prihodki: Math.round((totalRevenue - placaniPrihodki) * 100) / 100,
        skupna_placa: Math.round(skupnaPlaca * 100) / 100,
        trenutno_vozi: currentlyDrivingIds.size,
        aktivni_vozniki: activeDriverIds.size,
        skupaj_vozniki: actualDrivers.length,
      },
      voznje_po_vozniku: voznjePoVozniku,   
      prihodki_po_stranki: prihodkiPoStranki,
      prihodki_po_mesecih: prihodkiPoMesecih,
    },
  };
}
 
export default async function dashboard(app) {
  const routeOptions = {
    onRequest: [app.authenticate, protectedOnly],
    schema: {
      description: "Analitični dashboard za vodstvo (samo admin/vodstvo)",
      querystring: dashboardQuerySchema,
    },
  };
 
  app.get("/", routeOptions, async (request) => {
    const data = await loadDashboardData(app, request.query);
    return data.dashboard;
  });
 
  app.get("/statistics", routeOptions, async (request) => {
    return loadTahografStatistics(app, request.query);
  });
 
  app.get("/recent-rides", routeOptions, async (request) => {
    const data = await loadDashboardData(app, request.query);
    return data.recentRides;
  });
 
  app.get("/alerts", routeOptions, async (request) => {
    const data = await loadDashboardData(app, request.query);
    return data.alerts;
  });
}
