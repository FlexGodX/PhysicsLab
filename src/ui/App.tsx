import { findStudyModule } from "../studio/moduleCatalog";
const CourseStudio = lazy(() =>
  import("./CourseStudio").then((m) => ({ default: m.CourseStudio })),
);
const CustomLesson = lazy(() =>
  import("./CustomLesson").then((m) => ({ default: m.CustomLesson })),
);
const StudyChat = lazy(() =>
  import("./StudyChat").then((m) => ({ default: m.StudyChat })),
);
import type { ModelExperiment } from "../content/types";
import type {
  FigureSpec,
  VisualizationExperiment,
} from "../figures/experiment";
import { useState, lazy, Suspense } from "react";
import {
  Atom,
  WandSparkles,
  MessagesSquare,
  SlidersHorizontal,
  BookOpen,
  FlaskConical,
  ChartNoAxesCombined,
  Settings2,
  HardDrive,
  Download,
  ArrowUpRight,
} from "lucide-react";
const Playground = lazy(() =>
  import("./Playground").then((module) => ({ default: module.Playground })),
);
const ModuleLesson = lazy(() =>
  import("./ModuleLesson").then((module) => ({ default: module.ModuleLesson })),
);
import type { ExtraUnitId } from "../content/modules";
import { Course } from "./Course";
const Lesson = lazy(() =>
  import("./Lesson").then((module) => ({ default: module.Lesson })),
);
const Results = lazy(() =>
  import("./Results").then((module) => ({ default: module.Results })),
);
import { Settings } from "./Settings";
import { useWorkspace } from "./useWorkspace";
import type { LinearParams } from "../physics/linear";
import { downloadBackup } from "../persistence/store";
export function App() {
  const { data, ready, writable, status, memory, update } = useWorkspace();
  const [page, setPage] = useState<
    "course" | "lesson" | "results" | "playground" | "studio" | "chat"
  >("course");
  const [customId, setCustomId] = useState<string | null>(null);
  const [chatTopic, setChatTopic] = useState("K1");
  function openCustom(id: string) {
    setCustomId(id);
    setPage("lesson");
    setLessonKey((k) => k + 1);
  }
  const [modelReplay, setModelReplay] = useState<ModelExperiment | undefined>();
  const [visualizationReplay, setVisualizationReplay] = useState<{
    figure: FigureSpec;
    initial?: VisualizationExperiment;
    key: string;
  }>();
  function openVisualization(
    figure: FigureSpec,
    initial?: VisualizationExperiment,
  ) {
    setVisualizationReplay({ figure, initial, key: crypto.randomUUID() });
    setModelReplay(undefined);
    setPage("playground");
  }
  const [settings, setSettings] = useState(false);
  const [replay, setReplay] = useState<LinearParams | undefined>();
  const [lessonKey, setLessonKey] = useState(0);
  const [activeUnit, setActiveUnit] = useState<"K1" | ExtraUnitId>("K1");
  function openUnit(id: ExtraUnitId) {
    setCustomId(null);
    setActiveUnit(id);
    setLessonKey((k) => k + 1);
    setPage("lesson");
    if (writable && !data.moduleMarks[id]?.openedAt)
      void update({
        ...data,
        moduleMarks: {
          ...data.moduleMarks,
          [id]: {
            openedAt: new Date().toISOString(),
            selfMarkedAt: data.moduleMarks[id]?.selfMarkedAt ?? null,
          },
        },
      });
  }
  function start() {
    setCustomId(null);
    setActiveUnit("K1");
    setReplay(undefined);
    setLessonKey((k) => k + 1);
    setPage("lesson");
    if (writable && !data.materialOpenedAt)
      void update({ ...data, materialOpenedAt: new Date().toISOString() });
  }
  const nav = [
    { id: "course" as const, title: "Курс", icon: BookOpen },
    { id: "lesson" as const, title: "Занятие", icon: FlaskConical },
    {
      id: "playground" as const,
      title: "Игровая площадка",
      icon: SlidersHorizontal,
    },
    { id: "studio" as const, title: "Мастерская", icon: WandSparkles },
    { id: "chat" as const, title: "Обсудить с ИИ", icon: MessagesSquare },
    { id: "results" as const, title: "Результаты", icon: ChartNoAxesCombined },
  ];
  return (
    <div className="app-shell">
      <a href="#main" className="skip-link">
        К содержимому
      </a>
      <aside className="sidebar no-print">
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            setPage("course");
          }}
        >
          <span className="brand-symbol">
            <Atom size={25} />
          </span>
          <span>
            Физика
            <br />
            <strong>в действии</strong>
          </span>
        </a>
        <div className="sidebar-caption">ЛИЧНОЕ ПРОСТРАНСТВО</div>
        <nav aria-label="Основная навигация">
          {nav.map((n) => (
            <button
              key={n.id}
              aria-current={page === n.id ? "page" : undefined}
              className={page === n.id ? "active" : ""}
              onClick={() => {
                if (n.id === "lesson") {
                  if (customId) openCustom(customId);
                  else if (activeUnit === "K1") start();
                  else openUnit(activeUnit);
                } else {
                  setPage(n.id);
                  if (n.id === "playground") {
                    setModelReplay(undefined);
                    setVisualizationReplay(undefined);
                  }
                }
                setSettings(false);
              }}
            >
              <n.icon size={19} />
              {n.title}
              {page === n.id && <span className="nav-dot" />}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="local-note">
            <HardDrive size={18} />
            <strong>Всё на вашем устройстве</strong>
            <p>
              История хранится в браузере. ИИ получает материал только по вашему
              запросу.
            </p>
            <button
              className="text-button"
              onClick={() => downloadBackup(data)}
            >
              Скачать копию <ArrowUpRight size={14} />
            </button>
          </div>
          <button
            className="settings-button"
            onClick={() => setSettings((s) => !s)}
          >
            <Settings2 size={18} />
            Настройки
          </button>
          <div className="profile">
            <span>Я</span>
            <div>
              <strong>Моя лаборатория</strong>
              <small>Без регистрации</small>
            </div>
            <span className="online-dot" />
          </div>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar no-print">
          <div>
            <span className="muted">Лаборатория</span>
            <span className="crumb">/</span>
            <span>{nav.find((n) => n.id === page)?.title}</span>
          </div>
          <div className="topbar-right">
            <span className={`storage-status ${memory ? "warning" : ""}`}>
              <span className="online-dot" />
              {status}
            </span>
            <button
              aria-label="Скачать резервную копию"
              title="Скачать резервную копию"
              onClick={() => downloadBackup(data)}
            >
              <Download size={17} />
            </button>
            <button
              className="mobile-settings"
              aria-label="Настройки"
              onClick={() => setSettings((s) => !s)}
            >
              <Settings2 size={18} />
            </button>
          </div>
        </header>
        <main id="main" tabIndex={-1}>
          <Suspense
            fallback={
              <div className="panel" role="status">
                Открываем раздел…
              </div>
            }
          >
            {!ready ? (
              <div className="panel">Открываем лабораторию…</div>
            ) : (
              <>
                {!writable && (
                  <div className="callout no-print" role="status">
                    Режим чтения. Если лаборатория открыта в другой вкладке,
                    продолжите там или закройте её — эта вкладка получит доступ
                    к записи.
                  </div>
                )}
                {memory && (
                  <div className="callout warning no-print" role="alert">
                    Данные сейчас только в памяти. Скачайте резервную копию
                    перед закрытием страницы.
                  </div>
                )}
                {page === "lesson" && !settings && (
                  <div className="row no-print">
                    <button
                      onClick={() => {
                        setChatTopic(customId ?? activeUnit);
                        setPage("chat");
                      }}
                    >
                      Обсудить эту тему
                    </button>
                  </div>
                )}
                {settings ? (
                  <Settings
                    data={data}
                    writable={writable}
                    onUpdate={(next) => update(next, true)}
                    onClose={() => setSettings(false)}
                  />
                ) : page === "studio" ? (
                  <CourseStudio
                    data={data}
                    writable={writable}
                    onUpdate={update}
                    onOpen={openCustom}
                    onUseVisualization={openVisualization}
                  />
                ) : page === "chat" ? (
                  <StudyChat
                    key={chatTopic}
                    initialTopic={chatTopic}
                    data={data}
                    writable={writable}
                    onUpdate={update}
                  />
                ) : page === "lesson" &&
                  customId &&
                  findStudyModule(data, customId) ? (
                  <CustomLesson
                    key={`${customId}:${lessonKey}`}
                    module={findStudyModule(data, customId)!}
                    onOpenTopic={openCustom}
                    onOpenRelated={(id) =>
                      id === "K1" ? start() : openUnit(id)
                    }
                    data={data}
                    writable={writable}
                    onUpdate={update}
                  />
                ) : page === "playground" ? (
                  <Playground
                    key={visualizationReplay?.key ?? modelReplay?.id ?? "free"}
                    initial={modelReplay}
                    initialFigure={visualizationReplay?.figure}
                    initialResearch={visualizationReplay?.initial}
                    data={data}
                    writable={writable}
                    onUpdate={update}
                  />
                ) : page === "course" ? (
                  <Course
                    data={data}
                    writable={writable}
                    onUpdate={update}
                    onStart={start}
                    onOpenUnit={openUnit}
                    onCreate={() => setPage("studio")}
                    onCustom={openCustom}
                  />
                ) : page === "lesson" && activeUnit !== "K1" ? (
                  <ModuleLesson
                    key={`${activeUnit}:${lessonKey}`}
                    id={activeUnit}
                    data={data}
                    writable={writable}
                    onUpdate={update}
                  />
                ) : page === "lesson" ? (
                  <Lesson
                    key={lessonKey}
                    data={data}
                    writable={writable}
                    onUpdate={update}
                    replay={replay}
                  />
                ) : (
                  <Results
                    onVisualizationReplay={(e) =>
                      openVisualization(e.figureSnapshot, e)
                    }
                    onModelReplay={(e) => {
                      setVisualizationReplay(undefined);
                      setModelReplay(e);
                      setPage("playground");
                    }}
                    data={data}
                    onReplay={(p) => {
                      setCustomId(null);
                      setActiveUnit("K1");
                      setReplay({ ...p });
                      setLessonKey((k) => k + 1);
                      setPage("lesson");
                    }}
                  />
                )}
              </>
            )}
          </Suspense>
        </main>
        <footer className="no-print">
          <span>Физика в действии</span>
          <span>Предположить → проверить → объяснить</span>
          <span>v0.2 · лаборатория и личный курс</span>
        </footer>
      </div>
    </div>
  );
}
