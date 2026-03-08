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

const seedCase = {
  id: "6c72dd14-d4b8-4903-96c9-8eac0efaf748",
  title: "A.R. Placement Support",
  createdBy: "c3577a4f-8f7d-4a87-95ad-458cf7fd3c63",
};

export async function ensureSeedData(query) {
  for (const u of seedUsers) {
    await query(
      `INSERT INTO users(id, email, full_name, role)
       VALUES ($1,$2,$3,$4)
       ON CONFLICT(email) DO UPDATE SET full_name = EXCLUDED.full_name, role = EXCLUDED.role`,
      [u.id, u.email, u.fullName, u.role]
    );
  }

  await query(
    `INSERT INTO cases(id, title, created_by)
     VALUES ($1,$2,$3)
     ON CONFLICT(id) DO NOTHING`,
    [seedCase.id, seedCase.title, seedCase.createdBy]
  );

  for (const u of seedUsers.filter((x) => x.role !== "admin")) {
    await query(
      `INSERT INTO case_members(id, case_id, user_id, role)
       VALUES ($1,$2,$3,$4)
       ON CONFLICT(case_id,user_id) DO UPDATE SET role = EXCLUDED.role`,
      [randomUUID(), seedCase.id, u.id, u.role]
    );
  }

  await query(
    `INSERT INTO timeline_events(id, case_id, type, text, created_by)
     VALUES ($1,$2,$3,$4,$5)
     ON CONFLICT(id) DO NOTHING`,
    [
      "11111111-1111-4111-8111-111111111111",
      seedCase.id,
      "status",
      "Case opened",
      seedCase.createdBy,
    ]
  );
}
