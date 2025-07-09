const express = require('express');
const cors = require('cors');
const app = express();
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const DATA_FILE = path.join(__dirname, 'data.json');

let db = {};

// Carregar dados do arquivo se existir
if (fs.existsSync(DATA_FILE)) {
  db = JSON.parse(fs.readFileSync(DATA_FILE));
}

function saveDB() {
  fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2));
}

app.post('/api/create', (req, res) => {
  const { name, positives, negatives } = req.body;
  if (!name || !positives || !negatives || positives.length !== 3 || negatives.length !== 3) {
    return res.status(400).json({ error: 'Dados inválidos' });
  }
  const id = crypto.randomBytes(8).toString('hex');
  db[id] = {
    name,
    self: { positives, negatives },
    friends: []
  };
  saveDB();
  res.json({ success: true, id });
});

app.post('/api/friend/:id', (req, res) => {
  const id = req.params.id;
  const { positives, negatives } = req.body;
  if (!db[id]) {
    return res.status(404).json({ error: 'ID não encontrado' });
  }
  if (!positives || !negatives || positives.length !== 3 || negatives.length !== 3) {
    return res.status(400).json({ error: 'Dados inválidos' });
  }
  db[id].friends.push({ positives, negatives });
  saveDB();
  res.json({ success: true });
});

app.get('/api/result/:id', (req, res) => {
  const id = req.params.id;
  if (!db[id]) return res.status(404).json({ error: 'ID não encontrado' });

  const POSITIVOS = [
    "Amigável", "Confiável", "Comunicativa", "Criativa", "Cuidadosa",
    "Determinado(a)", "Disciplinado(a)", "Empático(a)", "Engraçado(a)", "Entusiasmado(a)",
    "Flexível", "Generoso(a)", "Honesto(a)", "Imaginativo(a)", "Independente",
    "Influente", "Inspirador(a)", "Inteligente", "Intuitivo(a)", "Lógico(a)",
    "Motivado(a)", "Observador(a)", "Objetivo(a)", "Organizado(a)", "Paciente",
    "Persistente", "Prático(a)", "Proativo(a)", "Racional", "Resiliente",
    "Responsável", "Seguro(a)", "Sensível", "Sociável", "Solidário(a)",
    "Talentoso(a)", "Tranquilo(a)", "Versátil", "Visionário(a)", "Vivaz"
  ];

  const NEGATIVOS = [
    "Ansioso(a)", "Arrogante", "Autoritário(a)", "Cético(a)", "Desconfiado(a)",
    "Desorganizado(a)", "Distraído(a)", "Egocêntrico(a)", "Emotivo(a)", "Explosivo(a)",
    "Impaciente", "Impulsivo(a)", "Indeciso(a)", "Inseguro(a)", "Introvertido(a)",
    "Irritável", "Irresponsável", "Mentiroso(a)", "Imaturo(a)", "Mau humorado",
    "Nervoso(a)", "Orgulhoso(a)", "Passivo(a)", "Perfeccionista", "Postergador(a)",
    "Rígido(a)", "Sarcástico(a)", "Sensível demais", "Teimoso(a)", "Tímido(a)"
  ];

  const allPositives = new Set();
  const allNegatives = new Set();

  // Self
  db[id].self.positives.forEach(p => allPositives.add(p));
  db[id].self.negatives.forEach(n => allNegatives.add(n));

  // Friends
  db[id].friends.forEach(f => {
    f.positives.forEach(p => allPositives.add(p));
    f.negatives.forEach(n => allNegatives.add(n));
  });

  const selfPos = new Set(db[id].self.positives);
  const selfNeg = new Set(db[id].self.negatives);

  const friendsPos = new Set();
  const friendsNeg = new Set();

  db[id].friends.forEach(f => {
    f.positives.forEach(p => friendsPos.add(p));
    f.negatives.forEach(n => friendsNeg.add(n));
  });

  const abertoPos = [...selfPos].filter(x => friendsPos.has(x));
  const abertoNeg = [...selfNeg].filter(x => friendsNeg.has(x));

  const cegoPos = [...friendsPos].filter(x => !selfPos.has(x));
  const cegoNeg = [...friendsNeg].filter(x => !selfNeg.has(x));

  const ocultoPos = [...selfPos].filter(x => !friendsPos.has(x));
  const ocultoNeg = [...selfNeg].filter(x => !friendsNeg.has(x));

  const desconhecidoPos = POSITIVOS.filter(p => !allPositives.has(p));
  const desconhecidoNeg = NEGATIVOS.filter(n => !allNegatives.has(n));

  res.json({
    id,
    name: db[id].name,
    quadrantes: {
      aberto: { positivos: abertoPos, negativos: abertoNeg },
      cego: { positivos: cegoPos, negativos: cegoNeg },
      oculto: { positivos: ocultoPos, negativos: ocultoNeg },
      desconhecido: { positivos: desconhecidoPos, negativos: desconhecidoNeg }
    }
  });
});

const PORT = process.env.PORT || 3000;

app.get('/api/positives', (req, res) => {
  res.json(POSITIVOS);
});

app.get('/api/negatives', (req, res) => {
  res.json(NEGATIVOS);
});

app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
