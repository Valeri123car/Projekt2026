const dashboardQuerySchema = {
  type: "object",
  properties: {
    fk_uporabnik: { type: "integer" },
    fk_stranka: { type: "integer" },
    od: { type: "string", format: "date" },
    do: { type: "string", format: "date" },
  },
};

function requireDashboardAccess(request, reply) {
  if (request.user.vloga === 1) {
    reply.code(403).send({ error: "Dostop zavrnjen samo admin/vodstvo" });
    return false;
  }

  return true;
}

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
    whereVoznje.datum = {};
    whereUrnik.datum = {};

    if (od) {
      whereVoznje.datum.gte = new Date(od);
      whereUrnik.datum.gte = new Date(od);
    }

    if (do_) {
      whereVoznje.datum.lte = new Date(do_);
      whereUrnik.datum.lte = new Date(do_);
    }
  }

  return {
    whereVoznje,
    whereUrnik,
    fk_uporabnik: fk_uporabnik ? parseInt(fk_uporabnik) : null,
  };
}

function calculateRideHours(ride) {
  if (!ride.zacetek || !ride.konc) {
    return 0;
  }

  return (new Date(ride.konc) - new Date(ride.zacetek)) / 1000 / 3600;
}

function formatRecentRide(ride) {
  const hours = calculateRideHours(ride);
  const km = Math.max(0, Math.round(hours * 62));
  const driver = `${ride.uporabnik?.ime || ""} ${ride.uporabnik?.priimek || ""}`.trim() || "Neznani voznik";
  const completedAt = ride.konc ? new Date(ride.konc) : null;
  const startedRecently = completedAt
    ? Date.now() - completedAt.getTime() < 2 * 60 * 60 * 1000
    : false;

  return {
    id: `VOZ-${ride.id_voznja}`,
    driver,
    km,
    hours: `${hours.toFixed(2)}h`,
    consumption: Number((km / Math.max(hours, 1) / 2.2).toFixed(1)),
    status: startedRecently ? "voznji" : "počitek",
    location: ride.relacija || ride.stranka || "Neznano",
  };
}

function buildAlerts({ voznje, urniki, statistics }) {
  const alerts = [];
  const longestRide = voznje.reduce((currentMax, ride) => {
    const hours = calculateRideHours(ride);
    return hours > currentMax ? hours : currentMax;
  }, 0);

  const unpaidRevenue = urniki
    .filter((urnik) => !urnik.placano)
    .reduce((sum, urnik) => sum + (urnik.cena || 0), 0);

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
    description: `${statistics.activeDrivers} od ${statistics.totalDrivers} voznikov je aktivnih`,
    icon: "check_circle",
  });

  return alerts;
}

async function loadDashboardData(app, query) {
  const { whereVoznje, whereUrnik } = buildDashboardFilters(query);

  const [voznje, urniki, vozniki, racuni] = await Promise.all([
    app.prisma.voznja.findMany({
      where: whereVoznje,
      orderBy: { datum: "desc" },
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
      select: {
        id_uporabnik: true,
        ime: true,
        priimek: true,
      },
    }),
    app.prisma.racun.findMany({
      where: query.fk_uporabnik ? { fk_uporabnik: parseInt(query.fk_uporabnik) } : {},
    }),
  ]);

  const totalHours = voznje.reduce((acc, ride) => acc + calculateRideHours(ride), 0);
  const recentRides = voznje.slice(0, 5).map(formatRecentRide);
  const totalKm = recentRides.reduce((acc, ride) => acc + ride.km, 0);
  const totalRevenue = urniki.reduce((acc, urnik) => acc + (urnik.cena || 0), 0);
  const activeDriverIds = new Set(
    voznje
      .filter((ride) => Date.now() - new Date(ride.datum).getTime() < 7 * 24 * 60 * 60 * 1000)
      .map((ride) => ride.fk_uporabnik),
  );

  const statistics = {
    totalHours: Math.round(totalHours * 100) / 100,
    totalKm,
    totalRevenue: Math.round(totalRevenue * 100) / 100,
    activeDrivers: activeDriverIds.size,
    totalDrivers: vozniki.length,
  };

  const alerts = buildAlerts({ voznje, urniki, statistics });

  const skupniPrihodki = totalRevenue;
  const placaniPrihodki = urniki
    .filter((urnik) => urnik.placano)
    .reduce((acc, urnik) => acc + (urnik.cena || 0), 0);
  const skupnaPlaca = racuni.reduce((acc, racun) => acc + (racun.placa || 0), 0);

  const prihodkiPoStranki = urniki.reduce((acc, urnik) => {
    const naziv = urnik.stranka?.naziv || "Neznana stranka";
    if (!acc[naziv]) acc[naziv] = 0;
    acc[naziv] += urnik.cena || 0;
    return acc;
  }, {});

  const voznjePoVozniku = vozniki.map((voznik) => {
    const voznjeVoznika = voznje.filter(
      (ride) => ride.fk_uporabnik === voznik.id_uporabnik,
    );
    const ure = voznjeVoznika.reduce((acc, ride) => acc + calculateRideHours(ride), 0);

    return {
      voznik: `${voznik.ime} ${voznik.priimek}`,
      st_vozenj: voznjeVoznika.length,
      skupne_ure: Math.round(ure * 100) / 100,
    };
  });

  const prihodkiPoMesecih = urniki.reduce((acc, urnik) => {
    const mesec = new Date(urnik.datum).toISOString().slice(0, 7);
    if (!acc[mesec]) acc[mesec] = 0;
    acc[mesec] += urnik.cena || 0;
    return acc;
  }, {});

  return {
    statistics,
    recentRides,
    alerts,
    dashboard: {
      povzetek: {
        skupne_ure: Math.round(totalHours * 100) / 100,
        st_vozenj: voznje.length,
        st_urnikov: urniki.length,
        skupni_prihodki: Math.round(skupniPrihodki * 100) / 100,
        placani_prihodki: Math.round(placaniPrihodki * 100) / 100,
        neplacani_prihodki: Math.round((skupniPrihodki - placaniPrihodki) * 100) / 100,
        skupna_placa: Math.round(skupnaPlaca * 100) / 100,
      },
      voznje_po_vozniku: voznjePoVozniku,
      prihodki_po_stranki: prihodkiPoStranki,
      prihodki_po_mesecih: prihodkiPoMesecih,
    },
  };
}

export default async function dashboard(app) {
  const routeOptions = {
    onRequest: [app.authenticate],
    schema: {
      description: "Analitični dashboard za vodstvo (samo admin/vodstvo)",
      querystring: dashboardQuerySchema,
    },
  };

  app.get("/", routeOptions, async (request, reply) => {
    if (!requireDashboardAccess(request, reply)) {
      return;
    }

    const data = await loadDashboardData(app, request.query);
    return data.dashboard;
  });

  app.get("/statistics", routeOptions, async (request, reply) => {
    if (!requireDashboardAccess(request, reply)) {
      return;
    }

    const data = await loadDashboardData(app, request.query);
    return data.statistics;
  });

  app.get("/recent-rides", routeOptions, async (request, reply) => {
    if (!requireDashboardAccess(request, reply)) {
      return;
    }

    const data = await loadDashboardData(app, request.query);
    return data.recentRides;
  });

  app.get("/alerts", routeOptions, async (request, reply) => {
    if (!requireDashboardAccess(request, reply)) {
      return;
    }

    const data = await loadDashboardData(app, request.query);
    return data.alerts;
  });
}
