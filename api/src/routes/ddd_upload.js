import { spawn } from "child_process";
import fs from "fs/promises";
import path from "path";
import os from "os";

async function runPythonParser(pythonPath, pythonArgs, fileType) {
  return new Promise((resolve, reject) => {
    let output = "";
    let errorOutput = "";

    const python = spawn("python3", [pythonPath, ...pythonArgs]);

    python.stdout.on("data", (data) => {
      output += data.toString();
    });

    python.stderr.on("data", (data) => {
      errorOutput += data.toString();
    });

    python.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`${fileType} parser failed: ${errorOutput}`));
        return;
      }
      const jsonStart = output.indexOf("{");
      if (jsonStart === -1) {
        reject(new Error(`No JSON found in output: ${output}`));
        return;
      }
      try {
        resolve(JSON.parse(output.substring(jsonStart)));
      } catch {
        reject(new Error(`Failed to parse ${fileType} output: ${output}`));
      }
    });

    python.on("error", reject);
  });
}

function resolveScriptArgs(filename, tempFilePath) {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".ddd")) {
    return {
      fileType: "DDD",
      script: "readDDDfile.py",
      args: [tempFilePath, "", "--db"],
    };
  }
  if (lower.endsWith(".xlsx") || lower.endsWith(".xls")) {
    return {
      fileType: "Excel",
      script: "readExcelFile.py",
      args: [tempFilePath, "", "--db"],
    };
  }
  return null;
}

function parseTrajanje(t) {
  if (!t) return null;
  if (typeof t === "number") return t;
  if (typeof t === "string" && t.includes(":")) {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
  }
  return null;
}

function normalizeStanje(aktivnost) {
  return (aktivnost || "DRUGO")
    .toUpperCase()
    .replace("VOŽNJA", "VOZNJA")
    .replace("POČITEK", "POCITEK")
    .replace("RAZPOLOŽLJIVOST", "RAZPOLOZLJIVOST");
}

async function findUser(prisma, voznikName) {
  const parts = voznikName.split(" ");
  const priimek = parts[0];
  const ime = parts.slice(1).join(" ");

  return prisma.uporabnik.findFirst({
    where: {
      ime: { equals: ime, mode: "insensitive" },
      priimek: { equals: priimek, mode: "insensitive" },
    },
    select: { id_uporabnik: true },
  });
}

async function saveVoznje(prisma, voznje, id_uporabnik) {
  await prisma.$transaction(
    voznje.map((voznja) =>
      prisma.tahografZapis.create({
        data: {
          fk_uporabnik: id_uporabnik,
          stanje: normalizeStanje(voznja.aktivnost),
          zacetek: new Date(voznja.zacetek),
          konec: new Date(voznja.konec),
          trajanje_min: parseTrajanje(voznja.dolzina || voznja.trajanje),
          registrska: voznja.registerska || null,
          posadka: voznja.posadka === "Da" || voznja.posadka === true || false,
          vir: "UVOZ",
        },
      }),
    ),
  );
}

export default async function dddUpload(app) {
  app.get(
    "/test-upload",
    {
      onRequest: [app.authenticate],
      schema: { description: "Testni endpoint za nalaganje DDD datoteke" },
    },
    async () => ({
      message:
        "Endpoint deluje, pošlji POST zahtevek z DDD datoteko na /upload",
    }),
  );

  app.post(
    "/upload",
    {
      onRequest: [app.authenticate],
      schema: {
        description: "Naloži in parsiraj DDD ali Excel datoteko dejavnosti",
        consumes: ["multipart/form-data"],
      },
    },
    async (request, reply) => {
      let tempFilePath = null;

      try {
        const data = await request.file();
        if (!data) {
          return reply.code(400).send({ error: "Datoteka ni bila naložena" });
        }

        const scriptInfo = resolveScriptArgs(data.filename, "");
        if (!scriptInfo) {
          return reply
            .code(400)
            .send({ error: "Datoteka mora biti .DDD ali .xlsx formata" });
        }

        tempFilePath = path.join(
          os.tmpdir(),
          `upload_${Date.now()}_${data.filename}`,
        );
        await fs.writeFile(tempFilePath, await data.toBuffer());

        const pythonPath = path.join(
          process.cwd(),
          "python",
          scriptInfo.script,
        );
        const pythonArgs = scriptInfo.args.map((a) =>
          a === "" ? tempFilePath : a,
        );
        pythonArgs[0] = tempFilePath;

        const parsedData = await runPythonParser(
          pythonPath,
          pythonArgs,
          scriptInfo.fileType,
        );

        await fs
          .unlink(tempFilePath)
          .catch((err) =>
            app.log.error("[UPLOAD] Napaka pri brisanju temp datoteke:", err),
          );
        tempFilePath = null;

        const drivers = parsedData.drivers ?? [{ voznik: parsedData.voznik, records: parsedData.records }];
        let totalSaved = 0;
        const notFound = [];

        for (const driver of drivers) {
          const user = await findUser(app.prisma, driver.voznik);
          if (!user) {
            notFound.push(driver.voznik);
            continue;
          }
          await saveVoznje(app.prisma, driver.records, user.id_uporabnik);
          totalSaved += driver.records.length;
        }

        if (totalSaved === 0 && notFound.length > 0) {
          return reply.code(404).send({
            error: "Nobeden od voznikov ni najden v bazi",
            details: `Vozniki niso najdeni: ${notFound.join(", ")}`,
          });
        }

        return reply.code(201).send({
          success: true,
          message: `${scriptInfo.fileType} datoteka uspešno parsirana`,
          fileType: scriptInfo.fileType,
          summary: { total: totalSaved, saved: totalSaved, notFound },
          data: parsedData,
        });
      } catch (error) {
        if (tempFilePath) {
          await fs.unlink(tempFilePath).catch(() => {});
        }
        return reply.code(500).send({
          error: "Napaka pri procesiranju datoteke",
          details: error.message,
        });
      }
    },
  );
}
