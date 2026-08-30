import React, { Suspense, lazy, useState } from "react";
import { BookOpenCheck, FolderKanban, GraduationCap, Home, LoaderCircle } from "lucide-react";

const ProjectGrader = lazy(() => import("./ProjectGrader"));
const ThesisGrader = lazy(() => import("./ThesisGrader"));

type GradingMode = "project" | "thesis";

class ModeErrorBoundary extends React.Component<
  { children: React.ReactNode; onBack: () => void },
  { error: Error | null }
> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error("Unified grader mode error:", error);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <main className="min-h-screen bg-slate-950 text-slate-100 grid place-items-center p-6">
        <section className="w-full max-w-xl rounded-3xl border border-red-500/40 bg-slate-900 p-7 shadow-2xl">
          <h1 className="text-xl font-black text-red-300">Không thể mở chế độ chấm</h1>
          <p className="mt-3 text-sm leading-6 text-slate-300">
            {this.state.error.message || "Ứng dụng gặp lỗi khi tải mô-đun."}
          </p>
          <button
            type="button"
            onClick={() => {
              this.setState({ error: null });
              this.props.onBack();
            }}
            className="mt-6 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold hover:bg-indigo-500"
          >
            Trở về chọn chế độ
          </button>
        </section>
      </main>
    );
  }
}

function ModePicker({ onSelect }: { onSelect: (mode: GradingMode) => void }) {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#172554_0%,#070b1d_42%,#020617_100%)] text-slate-100">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col justify-center px-5 py-12">
        <div className="mb-9 text-center">
          <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-orange-400 to-pink-600 shadow-xl shadow-pink-950/40">
            <BookOpenCheck className="h-8 w-8" />
          </div>
          <p className="text-xs font-black uppercase tracking-[0.32em] text-indigo-300">IFA AI Grader</p>
          <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-5xl">Chọn nội dung cần chấm</h1>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-6 text-slate-400">
            Hai quy trình dùng chung một địa chỉ nhưng giữ riêng rubric, danh sách sinh viên,
            bài nộp và tiến trình chấm.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <button
            type="button"
            onClick={() => onSelect("project")}
            className="group rounded-3xl border border-cyan-400/25 bg-slate-900/80 p-7 text-left shadow-2xl transition hover:-translate-y-1 hover:border-cyan-300/70 hover:bg-slate-900"
          >
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-cyan-400/15 text-cyan-300">
              <FolderKanban className="h-6 w-6" />
            </span>
            <h2 className="mt-5 text-2xl font-black">Chấm đồ án môn học</h2>
            <p className="mt-3 text-sm leading-6 text-slate-400">
              Dùng cho bài tập, đồ án môn học và bài vẽ. Một vai trò giảng viên, rubric linh hoạt theo môn.
            </p>
            <span className="mt-6 inline-flex rounded-full bg-cyan-400/10 px-3 py-1.5 text-xs font-bold text-cyan-300">
              Mở chế độ Chấm đồ án
            </span>
          </button>

          <button
            type="button"
            onClick={() => onSelect("thesis")}
            className="group rounded-3xl border border-fuchsia-400/25 bg-slate-900/80 p-7 text-left shadow-2xl transition hover:-translate-y-1 hover:border-fuchsia-300/70 hover:bg-slate-900"
          >
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-fuchsia-400/15 text-fuchsia-300">
              <GraduationCap className="h-6 w-6" />
            </span>
            <h2 className="mt-5 text-2xl font-black">Chấm thuyết minh DATN/DATH</h2>
            <p className="mt-3 text-sm leading-6 text-slate-400">
              Giữ đầy đủ cơ chế GVHD, phản biện, sửa bài, phát hiện nghi vấn AI và cảnh báo bất thường.
            </p>
            <span className="mt-6 inline-flex rounded-full bg-fuchsia-400/10 px-3 py-1.5 text-xs font-bold text-fuchsia-300">
              Mở chế độ Chấm thuyết minh
            </span>
          </button>
        </div>

        <p className="mt-8 text-center text-[11px] font-semibold uppercase tracking-widest text-slate-600">
          IFA AI Grader · Phiên bản V1.3
        </p>
      </div>
    </main>
  );
}

export default function App() {
  const [mode, setMode] = useState<GradingMode | null>(null);
  const [visited, setVisited] = useState<Record<GradingMode, boolean>>({
    project: false,
    thesis: false,
  });

  const selectMode = (nextMode: GradingMode) => {
    setVisited(current => ({ ...current, [nextMode]: true }));
    setMode(nextMode);
  };

  if (!mode) return <ModePicker onSelect={selectMode} />;

  return (
    <ModeErrorBoundary onBack={() => setMode(null)}>
      <Suspense
        fallback={
          <main className="min-h-screen bg-slate-950 text-indigo-200 grid place-items-center">
            <div className="flex items-center gap-3 text-sm font-bold">
              <LoaderCircle className="h-5 w-5 animate-spin" />
              Đang mở chế độ chấm...
            </div>
          </main>
        }
      >
        <div className="fixed bottom-4 right-4 z-[9999]">
          <button
            type="button"
            onClick={() => setMode(null)}
            className="flex items-center gap-2 rounded-full border border-white/15 bg-slate-950/90 px-4 py-2 text-xs font-black text-white shadow-2xl backdrop-blur hover:bg-indigo-700"
            title="Quay lại màn hình chọn chế độ; dữ liệu của chế độ đang mở vẫn được giữ trong phiên này"
          >
            <Home className="h-4 w-4" />
            Đổi chế độ
          </button>
        </div>

        {visited.project && (
          <section style={{ display: mode === "project" ? "block" : "none" }}>
            <ProjectGrader />
          </section>
        )}
        {visited.thesis && (
          <section style={{ display: mode === "thesis" ? "block" : "none" }}>
            <ThesisGrader />
          </section>
        )}
      </Suspense>
    </ModeErrorBoundary>
  );
}
