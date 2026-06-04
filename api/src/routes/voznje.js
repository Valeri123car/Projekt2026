import { spawn } from "child_process";
import fs from "fs/promises";
import path from "path";
import os from "os";

export default async function voznje(app) {
    const protectedOnly = async (request, reply) => {
        if (request.user.vloga !== 2 && request.user.vloga !== 3) {
            return reply.code(403).send({ error: "Dostop zavrnjen" });
        }
    };

    app.get(
        "/",
        {
            onRequest: [app.authenticate],
            schema: {
                description: "Vrni vse vožnje prijavljenega voznika",
            },
        },
        async (request) => {
            return app.prisma.voznja.findMany({
                where: { fk_uporabnik: request.user.id },
                orderBy: { datum: "desc" },
                select: {
                    id_voznja: true,
                    datum: true,
                    zacetek: true,
                    konc: true,
                    trajanje: true,
                    stranka: true,
                    relacija: true,
                    opis: true,
                    timestamp_zapis: true,
                    fk_uporabnik: true,
                },
            });
        },
    );

    app.post(
        "/",
        {
            onRequest: [app.authenticate],
            schema: {
                body: {
                    type: "object",
                    required: ["datum", "zacetek", "konc"],
                    properties: {
                        datum: { type: "string", format: "date" },
                        zacetek: { type: "string" },
                        konc: { type: "string" },
                        stranka: { type: "string" },
                        relacija: { type: "string" },
                        opis: { type: "string" },
                    },
                },
            },
        },
        async (request, reply) => {
            const {
                datum,
                zacetek,
                konc,
                fk_stranka,
                stranka,
                relacija,
                opis,
            } = request.body;

            const voznja = await app.prisma.voznja.create({
                data: {
                    datum: new Date(datum),
                    zacetek: new Date(zacetek),
                    konc: new Date(konc),
                    fk_uporabnik: request.user.id,
                    fk_stranka,
                    stranka: stranka || null,
                    relacija: relacija || null,
                    opis: opis || null,
                    timestamp_zapis: new Date(),
                },
            });

            return reply.code(201).send(voznja);
        },
    );

    app.delete(
        "/:id",
        {
            onRequest: [app.authenticate],
        },
        async (request, reply) => {
            const id = parseInt(request.params.id);

            const voznja = await app.prisma.voznja.findUnique({
                where: { id_voznja: id },
            });

            if (!voznja) {
                return reply.code(404).send({ error: "Vožnja ne obstaja" });
            }

            if (
                voznja.fk_uporabnik !== request.user.id &&
                request.user.vloga !== 2
            ) {
                return reply.code(403).send({ error: "Dostop zavrnjen" });
            }

            await app.prisma.voznja.delete({ where: { id_voznja: id } });

            return reply.code(204).send();
        },
    );
    app.get(
        "/voznjeMesec",
        {
            onRequest: [app.authenticate, protectedOnly],
            schema: {
                description: "Vrni mesečno poročilo za izbrane voznike",
                querystring: {
                    type: "object",
                    required: ["od", "do"],
                    properties: {
                        od: { type: "string" },
                        do: { type: "string" },
                    },
                },
            },
        },
        async (request, reply) => {
            let { fk_uporabnik, od, do: doDate } = request.query;

            // Handle single or multiple user IDs
            let voznikIds = [];
            if (typeof fk_uporabnik === "string") {
                voznikIds = [parseInt(fk_uporabnik)];
            } else if (Array.isArray(fk_uporabnik)) {
                voznikIds = fk_uporabnik.map((id) => parseInt(id));
            }

            if (voznikIds.length === 0) {
                return reply
                    .code(400)
                    .send({ error: "Vsaj en voznik mora biti izbran" });
            }

            const monthFromDate = new Date(od);
            const monthToDate = new Date(doDate);
            monthToDate.setHours(23, 59, 59, 999);

            console.log("Fetching voznjeMesec with params:", {
                voznikIds,
                od,
                doDate,
                monthFromDate,
                monthToDate,
            });

            let izpis = [];
            // Fetch data for selected month from TahografZapis
            for (const id of voznikIds) {
                const zapisi = await app.prisma.tahografZapis.findMany({
                    where: {
                        fk_uporabnik: id,
                        zacetek: {
                            gte: monthFromDate,
                            lte: monthToDate,
                        },
                    },
                    select: {
                        konec: true,
                        posadka: true,
                        stanje: true,
                        trajanje_min: true,
                        zacetek: true,
                        vir: true,
                        uporabnik: { select: { ime: true, priimek: true } },
                    },
                    orderBy: { zacetek: "asc" },
                });

                const uporabnik = zapisi.length > 0
                    ? zapisi[0].uporabnik
                    : await app.prisma.uporabnik.findUnique({
                        where: { id_uporabnik: id },
                        select: { ime: true, priimek: true },
                    });

                const voznjeMesec = zapisi.map(({ uporabnik: _, ...rest }) => rest);

                const fourWeeksAgo = new Date(monthToDate);
                fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 112);

                const zapisi4tedne = await app.prisma.tahografZapis.findMany({
                    where: {
                        fk_uporabnik: id,
                        zacetek: { gte: fourWeeksAgo, lte: monthToDate },
                        stanje: { in: ["DELO", "VOZNJA"] },
                    },
                    select: { trajanje_min: true },
                });

                const voznje4mesece = zapisi4tedne.reduce((sum, z) => sum + (z.trajanje_min ?? 0), 0);

                izpis.push({ uporabnik, voznjeMesec, voznje4mesece });
            }

            return izpis;
        },
    );

    app.get(
        "/voznjeMesec/export",
        {
            onRequest: [app.authenticate, protectedOnly],
            schema: {
                description: "Izvozi delovni zapis v Excel",
                querystring: {
                    type: "object",
                    required: ["od", "do"],
                    properties: {
                        od: { type: "string" },
                        do: { type: "string" },
                    },
                },
            },
        },
        async (request, reply) => {
            let { fk_uporabnik, od, do: doDate } = request.query;

            let voznikIds = [];
            if (typeof fk_uporabnik === "string") {
                voznikIds = [parseInt(fk_uporabnik)];
            } else if (Array.isArray(fk_uporabnik)) {
                voznikIds = fk_uporabnik.map((id) => parseInt(id));
            }

            if (voznikIds.length === 0) {
                return reply.code(400).send({ error: "Vsaj en voznik mora biti izbran" });
            }

            const monthFromDate = new Date(od);
            const monthToDate = new Date(doDate);
            monthToDate.setHours(23, 59, 59, 999);

            // Build same izpis as /voznjeMesec
            const izpis = [];
            for (const id of voznikIds) {
                const zapisi = await app.prisma.tahografZapis.findMany({
                    where: {
                        fk_uporabnik: id,
                        zacetek: { gte: monthFromDate, lte: monthToDate },
                    },
                    select: {
                        konec: true,
                        posadka: true,
                        stanje: true,
                        trajanje_min: true,
                        zacetek: true,
                        vir: true,
                        uporabnik: { select: { ime: true, priimek: true } },
                    },
                    orderBy: { zacetek: "asc" },
                });

                const uporabnik = zapisi.length > 0
                    ? zapisi[0].uporabnik
                    : await app.prisma.uporabnik.findUnique({
                        where: { id_uporabnik: id },
                        select: { ime: true, priimek: true },
                    });

                const voznjeMesec = zapisi.map(({ uporabnik: _, ...rest }) => rest);

                const fourWeeksAgo = new Date(monthToDate);
                fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 112);
                const zapisi4tedne = await app.prisma.tahografZapis.findMany({
                    where: {
                        fk_uporabnik: id,
                        zacetek: { gte: fourWeeksAgo, lte: monthToDate },
                        stanje: { in: ["DELO", "VOZNJA"] },
                    },
                    select: { trajanje_min: true },
                });
                const voznje4mesece = zapisi4tedne.reduce((sum, z) => sum + (z.trajanje_min ?? 0), 0);

                izpis.push({ uporabnik, voznjeMesec, voznje4mesece });
            }

            const stamp = Date.now();
            const jsonPath = path.join(os.tmpdir(), `delovni_${stamp}.json`);
            const xlsxPath = path.join(os.tmpdir(), `delovni_${stamp}.xlsx`);
            const scriptPath = path.join(process.cwd(), "python", "json_to_delovni_zapis.py");

            await fs.writeFile(jsonPath, JSON.stringify(izpis), "utf-8");

            await new Promise((resolve, reject) => {
                let stderr = "";
                const py = spawn("python3", [scriptPath, jsonPath, xlsxPath]);
                py.stderr.on("data", (d) => { stderr += d.toString(); });
                py.on("close", (code) => {
                    if (code !== 0) reject(new Error(`Python failed: ${stderr}`));
                    else resolve();
                });
                py.on("error", reject);
            });

            const xlsxBuffer = await fs.readFile(xlsxPath);

            // Clean up temp files (fire-and-forget)
            fs.unlink(jsonPath).catch(() => {});
            fs.unlink(xlsxPath).catch(() => {});

            const filename = `delovni_zapis_${od}_${doDate}.xlsx`;
            reply
                .header("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
                .header("Content-Disposition", `attachment; filename="${filename}"`)
                .send(xlsxBuffer);
        },
    );
}
