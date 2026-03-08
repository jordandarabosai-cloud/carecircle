import express from "express";

const app = express();
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "carecircle-api" });
});

app.get("/roles", (_req, res) => {
  res.json({
    roles: ["foster_parent", "biological_parent", "case_worker", "gal", "admin"],
  });
});

app.get("/timeline/sample", (_req, res) => {
  res.json({
    caseId: "sample-case-1",
    events: [
      {
        id: "evt-1",
        type: "status",
        text: "Case opened",
        createdAt: new Date().toISOString(),
      },
    ],
  });
});

const port = process.env.PORT || 4010;
app.listen(port, () => {
  console.log(`CareCircle API listening on :${port}`);
});
