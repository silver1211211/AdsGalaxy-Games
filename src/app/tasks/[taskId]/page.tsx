import { AppShell } from "@/components/layout/app-shell";import { TaskDetail } from "@/components/tasks/task-detail";
export default async function TaskDetailPage({params}:{params:Promise<{taskId:string}>}){return <AppShell><TaskDetail taskId={(await params).taskId}/></AppShell>}
