export default async function dashboard(app) {
  app.get(
    "/",
    {
      onRequest: [app.authenticate],
      schema: {
        description: "Analitični dashboard za vodstvo (samo admin/vodstvo)",
        querystring: {
          type: "object",
          properties: {
            fk_uporabnik: { type: "integer" },
            fk_stranka: { type: "integer" },
            od: { type: "string", format: "date" },
            do: { type: "string", format: "date" },
          },
        },
      },
    },
    async (request, reply) => {
      if (request.user.vloga === 1) {
        return reply
          .code(403)
          .send({ error: "Dostop zavrnjen – samo admin/vodstvo" });
      }

      const { fk_uporabnik, fk_stranka, od, do: do_ } = request.query;

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

      const [voznje, urniki, vozniki, racuni] = await Promise.all([
        app.prisma.voznja.findMany({
          where: whereVoznje,
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
          where: fk_uporabnik ? { fk_uporabnik: parseInt(fk_uporabnik) } : {},
        }),
      ]);

      const skupneUre = voznje.reduce((acc, v) => {
        if (v.zacetek && v.konc) {
          const ure = (new Date(v.konc) - new Date(v.zacetek)) / 1000 / 3600;
          return acc + ure;
        }
        return acc;
      }, 0);

      const skupniPrihodki = urniki.reduce((acc, u) => acc + (u.cena || 0), 0);

      const placaniPrihodki = urniki
        .filter((u) => u.placano)
        .reduce((acc, u) => acc + (u.cena || 0), 0);

      const skupnaPlaca = racuni.reduce((acc, r) => acc + (r.placa || 0), 0);

      const prihodkiPoStranki = urniki.reduce((acc, u) => {
        const naziv = u.stranka?.naziv || "Neznana stranka";
        if (!acc[naziv]) acc[naziv] = 0;
        acc[naziv] += u.cena || 0;
        return acc;
      }, {});

      const voznjePovoznik = vozniki.map((voznik) => {
        const voznjeVoznika = voznje.filter(
          (v) => v.fk_uporabnik === voznik.id_uporabnik,
        );
        const ure = voznjeVoznika.reduce((acc, v) => {
          if (v.zacetek && v.konc) {
            return acc + (new Date(v.konc) - new Date(v.zacetek)) / 1000 / 3600;
          }
          return acc;
        }, 0);

        return {
          voznik: `${voznik.ime} ${voznik.priimek}`,
          st_vozenj: voznjeVoznika.length,
          skupne_ure: Math.round(ure * 100) / 100,
        };
      });

      const prihodkiPoMesecih = urniki.reduce((acc, u) => {
        const mesec = new Date(u.datum).toISOString().slice(0, 7);
        if (!acc[mesec]) acc[mesec] = 0;
        acc[mesec] += u.cena || 0;
        return acc;
      }, {});

      return {
        povzetek: {
          skupne_ure: Math.round(skupneUre * 100) / 100,
          st_vozenj: voznje.length,
          st_urnikov: urniki.length,
          skupni_prihodki: Math.round(skupniPrihodki * 100) / 100,
          placani_prihodki: Math.round(placaniPrihodki * 100) / 100,
          neplacani_prihodki:
            Math.round((skupniPrihodki - placaniPrihodki) * 100) / 100,
          skupna_placa: Math.round(skupnaPlaca * 100) / 100,
        },
        voznje_po_vozniku: voznjePovoznik,
        prihodki_po_stranki: prihodkiPoStranki,
        prihodki_po_mesecih: prihodkiPoMesecih,
      };
    },
  );
}
