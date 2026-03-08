import { randomUUID } from "node:crypto";

export const seedUsers = [
  {
    id: "9af0f5f6-2e42-4db0-a49d-9439f8f7be11",
    email: "admin@carecircle.dev",
    fullName: "Alex Admin",
    role: "admin",
  },
  {
    id: "c3577a4f-8f7d-4a87-95ad-458cf7fd3c63",
    email: "worker@carecircle.dev",
    fullName: "Case Worker Kim",
    role: "case_worker",
  },
  {
    id: "f164f0e8-f928-48fa-9448-2f45ce9806af",
    email: "foster@carecircle.dev",
    fullName: "Foster Parent Sam",
    role: "foster_parent",
  },
  {
    id: "52975fce-20ff-496d-8f78-35f06c7f245a",
    email: "bio@carecircle.dev",
    fullName: "Bio Parent Lee",
    role: "biological_parent",
  },
  {
    id: "a6464383-7b76-4d24-8e11-cda8fb763059",
    email: "gal@carecircle.dev",
    fullName: "GAL Jordan",
    role: "gal",
  },
];

const workerId = "c3577a4f-8f7d-4a87-95ad-458cf7fd3c63";

const seedCases = [
  { id: "6c72dd14-d4b8-4903-96c9-8eac0efaf748", title: "A.R. Placement Support", createdBy: workerId },
  { id: "8f41e0d1-f9bc-4a3a-939d-cf710af49dc1", title: "J.M. Reunification Planning", createdBy: workerId },
  { id: "9d873980-c8a2-42b8-a8dc-5472f3d87fd2", title: "K.S. School Stability", createdBy: workerId },
  { id: "2f5f0e9a-bdb7-4c4a-8ea1-72705d1a67f4", title: "L.T. Medical Coordination", createdBy: workerId },
  { id: "c72d6884-f4b0-4f2e-8f91-a9478f7e28a9", title: "D.P. Family Visit Scheduling", createdBy: workerId },
];

const seedTimelineEvents = [
  ["11111111-1111-4111-8111-111111111111", seedCases[0].id, "status", "Case opened"],
  ["11111111-1111-4111-8111-111111111112", seedCases[1].id, "hearing", "Court hearing scheduled for next Tuesday"],
  ["11111111-1111-4111-8111-111111111113", seedCases[2].id, "note", "School counselor check-in completed"],
  ["11111111-1111-4111-8111-111111111114", seedCases[3].id, "visit", "Pediatric appointment follow-up shared"],
  ["11111111-1111-4111-8111-111111111115", seedCases[4].id, "task", "Coordinate supervised family visit"],
];

const seedTasks = [
  ["22222222-2222-4222-8222-222222222221", seedCases[0].id, "Upload placement agreement", "open"],
  ["22222222-2222-4222-8222-222222222222", seedCases[1].id, "Confirm reunification checklist", "in_progress"],
  ["22222222-2222-4222-8222-222222222223", seedCases[2].id, "Review IEP action items", "open"],
  ["22222222-2222-4222-8222-222222222224", seedCases[3].id, "Share medication update", "done"],
  ["22222222-2222-4222-8222-222222222225", seedCases[4].id, "Finalize visit transport plan", "open"],
];

export async function ensureSeedData(query) {
  for (const u of seedUsers) {
    await query(
      `INSERT INTO users(id, email, full_name, role)
       VALUES ($1,$2,$3,$4)
       ON CONFLICT(email) DO UPDATE SET full_name = EXCLUDED.full_name, role = EXCLUDED.role`,
      [u.id, u.email, u.fullName, u.role]
    );
  }

  for (const c of seedCases) {
    await query(
      `INSERT INTO cases(id, title, created_by)
       VALUES ($1,$2,$3)
       ON CONFLICT(id) DO NOTHING`,
      [c.id, c.title, c.createdBy]
    );

    for (const u of seedUsers.filter((x) => x.role !== "admin")) {
      await query(
        `INSERT INTO case_members(id, case_id, user_id, role)
         VALUES ($1,$2,$3,$4)
         ON CONFLICT(case_id,user_id) DO UPDATE SET role = EXCLUDED.role`,
        [randomUUID(), c.id, u.id, u.role]
      );
    }
  }

  for (const [id, caseId, type, text] of seedTimelineEvents) {
    await query(
      `INSERT INTO timeline_events(id, case_id, type, text, created_by)
       VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT(id) DO NOTHING`,
      [id, caseId, type, text, workerId]
    );
  }

  for (const [id, caseId, title, status] of seedTasks) {
    await query(
      `INSERT INTO case_tasks(id, case_id, title, status, created_by)
       VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT(id) DO NOTHING`,
      [id, caseId, title, status, workerId]
    );
  }
}
