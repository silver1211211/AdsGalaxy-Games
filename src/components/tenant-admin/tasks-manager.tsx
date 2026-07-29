"use client";

import { Plus } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

type Task = {
  id: string;
  title: string;
  description: string;
  destinationUrl: string;
  category: string;
  rewardPoints: number;
  rewardWallet: string;
  completionsCount: number;
  maximumCompletions: number | null;
  status: string;
  createdAt: string;
};

const emptyForm = {
  title: "",
  description: "",
  destinationUrl: "https://",
  destinationType: "WEBSITE",
  rewardType: "POINTS",
  rewardAmount: "100",
  unlimited: true,
  maximumCompletions: null as number | null,
  status: "ACTIVE",
  startsAt: null,
  endsAt: null,
};

export function TasksManager({ tenantSlug }: { tenantSlug: string }) {
  const endpoint = `/api/${tenantSlug}/admin/tasks`;
  const [items, setItems] = useState<Task[]>([]);
  const [show, setShow] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    const response = await fetch(endpoint, { cache: "no-store" });
    const body = await response.json();
    if (response.ok) setItems(body.items);
  }, [endpoint]);

  useEffect(() => {
    void load();
  }, [load]);

  async function save() {
    setMessage(editingId ? "Saving…" : "Creating…");
    const response = await fetch(
      editingId ? `${endpoint}/${editingId}` : endpoint,
      {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      },
    );
    const body = await response.json();
    if (response.ok) {
      setForm(emptyForm);
      setEditingId(null);
      setShow(false);
      await load();
    }
    setMessage(
      response.ok
        ? editingId
          ? "Task updated and audit logged."
          : "Task created and audit logged."
        : (body.error ?? "Could not save task."),
    );
  }

  function edit(task: Task) {
    setEditingId(task.id);
    setShow(true);
    setForm({
      title: task.title,
      description: task.description,
      destinationUrl: task.destinationUrl,
      destinationType: task.category,
      rewardType: "POINTS",
      rewardAmount: String(task.rewardPoints),
      unlimited: task.maximumCompletions === null,
      maximumCompletions: task.maximumCompletions,
      status: task.status,
      startsAt: null,
      endsAt: null,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function changeStatus(id: string, action: string) {
    const response = await fetch(`${endpoint}/${id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    if (response.ok) await load();
  }

  return (
    <>
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-wider text-teal-600">
            Tasks
          </p>
          <h1 className="mt-1 text-3xl font-black">Tasks</h1>
        </div>
        <button
          onClick={() => {
            setEditingId(null);
            setForm(emptyForm);
            setShow(!show);
          }}
          className="game-primary"
        >
          <Plus size={17} />
          <span className="hidden sm:inline">Add Task</span>
          <span className="sm:hidden">Add</span>
        </button>
      </div>

      {show && (
        <section className="mt-6 grid gap-4 rounded-3xl bg-white p-5 shadow-card sm:grid-cols-2">
          <Field
            label="Task title"
            value={form.title}
            change={(value) => setForm({ ...form, title: value })}
          />
          <Select
            label="Destination type"
            value={form.destinationType}
            change={(value) => setForm({ ...form, destinationType: value })}
            options={[
              "WEBSITE",
              "TELEGRAM_CHANNEL",
              "TELEGRAM_GROUP",
              "TELEGRAM_BOT",
              "OTHER",
            ]}
          />
          <label className="grid gap-1 text-xs font-bold sm:col-span-2">
            Short description
            <textarea
              value={form.description}
              onChange={(event) =>
                setForm({ ...form, description: event.target.value })
              }
              rows={3}
              className="rounded-xl border p-3"
            />
          </label>
          <Field
            label="Destination URL"
            value={form.destinationUrl}
            change={(value) => setForm({ ...form, destinationUrl: value })}
          />
          <label className="grid gap-1 text-xs font-bold">
            Reward type
            <select
              value={form.rewardType}
              onChange={(event) =>
                setForm({ ...form, rewardType: event.target.value })
              }
              className="min-h-11 rounded-xl border px-3"
            >
              <option value="POINTS">Coins / Points</option>
              <option value="WALLET">
                USD wallet reward (trusted verification required)
              </option>
            </select>
          </label>
          <Field
            label="Reward amount"
            value={form.rewardAmount}
            type="number"
            change={(value) => setForm({ ...form, rewardAmount: value })}
          />
          <label className="flex min-h-11 items-center gap-3 text-sm font-bold">
            <input
              type="checkbox"
              checked={form.unlimited}
              onChange={(event) =>
                setForm({
                  ...form,
                  unlimited: event.target.checked,
                  maximumCompletions: event.target.checked ? null : 100,
                })
              }
              className="h-5 w-5 accent-teal-600"
            />
            Unlimited completions
          </label>
          {!form.unlimited && (
            <Field
              label="Maximum completions"
              type="number"
              value={String(form.maximumCompletions ?? "")}
              change={(value) =>
                setForm({ ...form, maximumCompletions: Number(value) })
              }
            />
          )}
          <Select
            label="Status"
            value={form.status}
            change={(value) => setForm({ ...form, status: value })}
            options={["ACTIVE", "PAUSED"]}
          />
          <button
            onClick={() => void save()}
            className="game-primary sm:col-span-2"
          >
            {editingId ? "Save Task" : "Create Task"}
          </button>
        </section>
      )}

      <section className="mt-6 grid gap-3">
        {items.map((task) => (
          <article
            key={task.id}
            className="rounded-3xl bg-white p-5 shadow-card"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-black">{task.title}</h2>
                <p className="mt-1 text-xs text-warm-500">
                  {task.category.replaceAll("_", " ")} · {task.rewardPoints}{" "}
                  points · {task.completionsCount}/
                  {task.maximumCompletions ?? "Unlimited"}
                </p>
                <p className="mt-1 text-[10px] text-warm-400">
                  Created {new Date(task.createdAt).toLocaleDateString()} ·{" "}
                  {task.status}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {task.status !== "ARCHIVED" && (
                  <button onClick={() => edit(task)} className="game-secondary">
                    Edit
                  </button>
                )}
                {task.status === "ACTIVE" && (
                  <button
                    onClick={() => void changeStatus(task.id, "PAUSE")}
                    className="game-secondary"
                  >
                    Pause
                  </button>
                )}
                {task.status === "PAUSED" && (
                  <button
                    onClick={() => void changeStatus(task.id, "RESUME")}
                    className="game-secondary"
                  >
                    Resume
                  </button>
                )}
                {task.status !== "ARCHIVED" && (
                  <button
                    onClick={() => void changeStatus(task.id, "ARCHIVE")}
                    className="game-secondary text-coral-700"
                  >
                    Archive
                  </button>
                )}
              </div>
            </div>
          </article>
        ))}
        {!items.length && (
          <p className="rounded-3xl bg-white p-8 text-center text-sm text-warm-400 shadow-card">
            No tasks created yet.
          </p>
        )}
      </section>
      <p
        aria-live="polite"
        className="mt-3 text-center text-xs font-bold text-teal-700"
      >
        {message}
      </p>
    </>
  );
}

function Field({
  label,
  value,
  change,
  type = "text",
}: {
  label: string;
  value: string;
  change: (value: string) => void;
  type?: string;
}) {
  return (
    <label className="grid gap-1 text-xs font-bold">
      {label}
      <input
        type={type}
        value={value}
        onChange={(event) => change(event.target.value)}
        className="min-h-11 rounded-xl border px-3"
      />
    </label>
  );
}

function Select({
  label,
  value,
  change,
  options,
}: {
  label: string;
  value: string;
  change: (value: string) => void;
  options: string[];
}) {
  return (
    <label className="grid gap-1 text-xs font-bold">
      {label}
      <select
        value={value}
        onChange={(event) => change(event.target.value)}
        className="min-h-11 rounded-xl border px-3"
      >
        {options.map((option) => (
          <option key={option}>{option}</option>
        ))}
      </select>
    </label>
  );
}
