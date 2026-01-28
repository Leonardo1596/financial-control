import { importCsv } from "../services/importCsv.js";
import { importOfx } from "../services/importOfx.js";

export async function importTransactions(req, res) {
  try {
    console.log("userId:", req.userId);
    console.log("file:", req.file);

    if (!req.userId) {
      return res.status(401).json({
        message: "Usuário não autenticado",
      });
    }

    if (!req.file) {
      return res.status(400).json({
        message: "Arquivo não enviado",
      });
    }

    const fileName = req.file.originalname.toLowerCase();
    let total = 0;

    if (fileName.endsWith(".csv")) {
      total = await importCsv(req.file.path, req.userId);
    } else if (fileName.endsWith(".ofx")) {
      total = await importOfx(req.file.path, req.userId);
    } else {
      return res.status(400).json({
        message: "Formato não suportado",
      });
    }

    return res.json({
      message: "Importação concluída",
      total,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      message: "Erro ao importar arquivo",
      error: err.message,
    });
  }
}
