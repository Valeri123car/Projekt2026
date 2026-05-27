import { spawn } from "child_process";
import fs from "fs/promises";
import path from "path";
import os from "os";

export default async function dddUpload(app) {
  app.get(
    "/test-upload",
    {
      onRequest: [app.authenticate],
      schema: {
        description: "Testni endpoint za nalaganje DDD datoteke",
      },
    }, async (request, reply) => {
      return { message: "Endpoint deluje, pošlji POST zahtevek z DDD datoteko na /upload" };
    }
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
      try {
        console.log("[UPLOAD] Prejem datoteke...");
        const data = await request.file();

        if (!data) {
          return reply.code(400).send({ error: "Datoteka ni bila naložena" });
        }


        const isDDD = data.filename.endsWith(".ddd");
        const isExcel = data.filename.endsWith(".xlsx") || data.filename.endsWith(".xls");

        if (!isDDD && !isExcel) {
          return reply
            .code(400)
            .send({ error: "Datoteka mora biti .ddd ali .xlsx formata" });
        }

   
        const tempDir = os.tmpdir();
        const tempFilePath = path.join(
          tempDir,
          `upload_${Date.now()}_${data.filename}`
        );


        const buffer = await data.toBuffer();
        await fs.writeFile(tempFilePath, buffer);

        console.log(`[UPLOAD] Datoteka naložena: ${tempFilePath}`);

        // Choose appropriate Python script based on file type
        let pythonScript, pythonArgs;
        let fileType;

        if (isDDD) {
          fileType = "DDD";
          pythonScript = "readDDDfile.py";
          pythonArgs = [tempFilePath, "", "--db"];
        } else {
          fileType = "Excel";
          pythonScript = "readExcelFile.py";
          pythonArgs = [tempFilePath];
        }

        // Get full path to Python script
        const pythonPath = path.join(
          process.cwd(),
          "python",
          pythonScript
        );

        console.log(`[UPLOAD] Python script path: ${pythonPath}`);
        console.log(`[UPLOAD] Python args: ${pythonArgs.join(" ")}`);

        const parsedData = await new Promise((resolve, reject) => {
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
            // Clean up temp file
            fs.unlink(tempFilePath).catch((err) =>
              console.error("[UPLOAD] Napaka pri brisanju temp datoteke:", err)
            );

            if (code !== 0) {
              console.error(`[UPLOAD] Python script failed with code ${code}`);
              console.error(`[UPLOAD] stderr: ${errorOutput}`);
              console.error(`[UPLOAD] stdout: ${output}`);
              reject(new Error(`${fileType} parser failed: ${errorOutput}`));
              return;
            }

            try {
              // Extract JSON from output (skip any debug messages before JSON)
              const jsonStart = output.indexOf('{');
              if (jsonStart === -1) {
                throw new Error(`No JSON found in output: ${output}`);
              }
              const jsonString = output.substring(jsonStart);
              const parsed = JSON.parse(jsonString);
              resolve(parsed);
            } catch (e) {
              reject(
                new Error(`Failed to parse ${fileType} output: ${output}`)
              );
            }
          });

          python.on("error", (err) => {
            fs.unlink(tempFilePath).catch(() => {});
            reject(err);
          });
        });

        //find user in database
        const voznikParts = parsedData.voznik.split(' ');
        const priimek = voznikParts[0];
        const ime = voznikParts.slice(1).join(' ');
        console.log(`[UPLOAD] Iskanje uporabnika: ${ime} ${priimek}`);

        const user = await app.prisma.uporabnik.findFirst({
          where: {
            ime: { equals: ime, mode: 'insensitive' },
            priimek: { equals: priimek, mode: 'insensitive' }
          },
          select: { id_uporabnik: true }
        });

        if (!user) {
          return reply.code(404).send({
            error: "Uporabnik ni najden",
            details: `Uporabnik z imenom "${parsedData.voznik}" ne obstaja v bazi`
          });
        }

        const id_uporabnik = user.id_uporabnik;
        console.log(`[UPLOAD] Uporabnik najden: ${parsedData.voznik} (ID: ${id_uporabnik})`);

        const voznje = parsedData.records;
        const results = {
          success: [],
          failed: []
        };

        for (let i = 0; i < voznje.length; i++) {
          const voznja = voznje[i];
          try {
            await app.prisma.voznja.create({
              data: {
                datum: new Date(),
                zacetek: new Date(voznja.zacetek),
                konec: new Date(voznja.konec),
                trajanje: voznja.dolzina || voznja.trajanje,
                aktivnost: voznja.aktivnost || null,
                registerska: voznja.registerska || null,
                posadka: voznja.posadka || null,
                fk_uporabnik: id_uporabnik
              }   
            });
            results.success.push(i + 1);
          } catch (error) {
            console.error(`[UPLOAD] Napaka pri shranjevanju voznje ${i + 1}:`, error.message);
            results.failed.push({
              index: i + 1,
              voznja: voznja,
              error: error.message
            });
          }
        }

        console.log(`[UPLOAD] Shranjenih vozanj: ${results.success.length}/${voznje.length}`);
        if (results.failed.length > 0) {
          console.log(`[UPLOAD] Napake pri ${results.failed.length} voznjah`);
        }

        return reply.code(201).send({
          success: true,
          message: `${fileType} datoteka uspešno parsirana`,
          fileType: fileType,
          summary: {
            total: voznje.length,
            saved: results.success.length,
            failed: results.failed.length
          },
          failures: results.failed.length > 0 ? results.failed : null,
          data: parsedData,
        });
      } catch (error) {
        console.error("[ERROR] Napaka pri nalaganju datoteke:", error.message);
        console.error("[ERROR] Stack:", error.stack);
        return reply.code(500).send({
          error: "Napaka pri procesiranju datoteke",
          details: error.message,
        });
      }
    }
  );
}
