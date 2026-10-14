"use client";

import { Bell, Check, ImagePlus, Moon, MonitorSmartphone, Plus, Search, Sparkles, Sun, Trash2, UtensilsCrossed } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { BrandScope, RestaurantLogo } from "@/components/brand";
import { Button, cn, inputClass, PageHeader, Segmented, Spinner } from "@/components/ui";
import { BM_ORANGE, COLOR_PRESETS, FONT_STYLES, onBrand, type FontStyle, type resolveBranding, type ThemeMode } from "@/lib/branding";
import { createClient } from "@/lib/supabase/client";

type Resolved = ReturnType<typeof resolveBranding>;

const HEX = /^#[0-9a-f]{6}$/i;
const SAMPLE = (id: string) => `https://images.unsplash.com/photo-${id}?w=500&q=60&auto=format&fit=crop`;

export function BrandEditor({ restaurantId, name, initialLogo, initial }: { restaurantId: string; name: string; initialLogo: string | null; initial: Resolved }) {
  const router = useRouter();
  const [primary, setPrimary] = useState(initial.primary);
  const [hexInput, setHexInput] = useState(initial.primary);
  const [font, setFont] = useState<FontStyle>(initial.font);
  const [theme, setTheme] = useState<ThemeMode>(initial.theme);
  const [tagline, setTagline] = useState(initial.tagline ?? "");
  const [cover, setCover] = useState(initial.cover_url ?? null);
  const [logo, setLogo] = useState(initialLogo);
  const [preview, setPreview] = useState<"light" | "dark">(initial.theme === "dark" ? "dark" : "light");
  const [uploading, setUploading] = useState<"logo" | "cover" | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const dirty =
    primary !== initial.primary ||
    font !== initial.font ||
    theme !== initial.theme ||
    (tagline.trim() || null) !== initial.tagline ||
    cover !== (initial.cover_url ?? null) ||
    logo !== initialLogo;

  function pickColor(hex: string) {
    setPrimary(hex.toLowerCase());
    setHexInput(hex.toLowerCase());
  }

  async function upload(kind: "logo" | "cover", file: File) {
    setUploading(kind);
    setMessage(null);
    const path = `${restaurantId}/${kind}-${crypto.randomUUID()}.${file.name.split(".").pop() || "png"}`;
    const { error } = await createClient().storage.from("menu").upload(path, file, { contentType: file.type });
    setUploading(null);
    if (error) return setMessage({ ok: false, text: `Não foi possível enviar a imagem: ${error.message}` });
    const url = createClient().storage.from("menu").getPublicUrl(path).data.publicUrl;
    if (kind === "logo") setLogo(url);
    else setCover(url);
  }

  async function save() {
    setSaving(true);
    setMessage(null);
    const { error } = await createClient()
      .from("restaurants")
      .update({
        logo_url: logo,
        branding: { primary, font, theme, tagline: tagline.trim() || null, cover_url: cover },
      })
      .eq("id", restaurantId);
    setSaving(false);
    if (error)
      return setMessage({
        ok: false,
        text: error.message.includes("branding")
          ? "O banco ainda não tem a coluna de identidade visual. Aplique o supabase/schema.sql atualizado (npm run db:migrate)."
          : error.message,
      });
    setMessage({ ok: true, text: "Identidade salva. Seus clientes já veem o cardápio novo." });
    router.refresh();
  }

  function reset() {
    pickColor(initial.primary);
    setFont(initial.font);
    setTheme(initial.theme);
    setTagline(initial.tagline ?? "");
    setCover(initial.cover_url ?? null);
    setLogo(initialLogo);
  }

  return (
    <div className="pb-28">
      <PageHeader
        title="Identidade visual"
        description="O cardápio que seus clientes abrem na mesa, com a cara do seu restaurante. As mudanças aparecem na prévia na hora."
      />

      <div className="mt-8 grid gap-8 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-5">
          <Section title="Logo e foto de capa" hint="A capa é a primeira imagem que o cliente vê ao escanear o QR Code. Use uma foto horizontal do salão ou do prato mais bonito.">
            <div className="flex flex-col gap-4 sm:flex-row">
              <UploadTile label="Logo" hint="Quadrada, fundo sólido" busy={uploading === "logo"} onFile={(f) => upload("logo", f)} onClear={logo ? () => setLogo(null) : undefined} className="sm:w-40">
                {logo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={logo} alt="" className="size-full object-cover" />
                ) : (
                  <span style={{ ["--brand" as string]: primary, ["--on-brand" as string]: onBrand(primary) }} className="flex size-full items-center justify-center">
                    <RestaurantLogo name={name} url={null} className="size-16 rounded-2xl text-2xl" />
                  </span>
                )}
              </UploadTile>
              <UploadTile label="Foto de capa" hint="Horizontal, pelo menos 1200 px" busy={uploading === "cover"} onFile={(f) => upload("cover", f)} onClear={cover ? () => setCover(null) : undefined} className="flex-1" wide>
                {cover ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={cover} alt="" className="size-full object-cover" />
                ) : (
                  <span className="flex size-full flex-col items-center justify-center gap-2 text-muted">
                    <ImagePlus className="size-7" />
                    <span className="text-xs">Sem capa: usamos a foto do seu prato em destaque</span>
                  </span>
                )}
              </UploadTile>
            </div>
          </Section>

          <Section title="Cor da marca" hint="Botões, destaques e detalhes do cardápio usam esta cor. O fundo ganha um leve toque dela.">
            <div className="flex flex-wrap gap-2.5">
              {COLOR_PRESETS.map((c) => {
                const on = primary === c.hex;
                return (
                  <button
                    key={c.hex}
                    type="button"
                    onClick={() => pickColor(c.hex)}
                    title={c.name}
                    aria-label={c.name}
                    aria-pressed={on}
                    className={cn("group relative size-11 rounded-full transition-transform hover:scale-110", on && "scale-110")}
                    style={{ background: c.hex }}
                  >
                    <span className={cn("absolute -inset-1 rounded-full border-2 transition-opacity", on ? "opacity-100" : "opacity-0")} style={{ borderColor: c.hex }} />
                    {on && <Check className="absolute inset-0 m-auto size-5 animate-pop" style={{ color: onBrand(c.hex) }} strokeWidth={3} />}
                  </button>
                );
              })}
              <label className="relative flex size-11 cursor-pointer items-center justify-center overflow-hidden rounded-full border-2 border-dashed border-line-strong text-muted transition hover:border-ink/40" title="Outra cor">
                <Plus className="size-5" />
                <input type="color" value={primary} onChange={(e) => pickColor(e.target.value)} className="absolute inset-0 cursor-pointer opacity-0" aria-label="Escolher outra cor" />
              </label>
            </div>
            <div className="mt-4 flex items-center gap-3">
              <span className="size-10 shrink-0 rounded-xl border border-line" style={{ background: primary }} />
              <input
                className={cn(inputClass, "max-w-36 font-mono uppercase")}
                value={hexInput}
                maxLength={7}
                onChange={(e) => {
                  const v = e.target.value.startsWith("#") ? e.target.value : `#${e.target.value}`;
                  setHexInput(v);
                  if (HEX.test(v)) setPrimary(v.toLowerCase());
                }}
                aria-label="Código da cor"
              />
              <span className="text-xs text-muted">Texto nos botões: {onBrand(primary) === "#ffffff" ? "branco" : "escuro"}, para manter a leitura.</span>
            </div>
          </Section>

          <Section title="Tipografia" hint="A fonte dos títulos dá o tom do cardápio. O texto corrido continua sempre legível.">
            <div className="grid gap-3 sm:grid-cols-2">
              {(Object.keys(FONT_STYLES) as FontStyle[]).map((f) => {
                const on = font === f;
                return (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setFont(f)}
                    aria-pressed={on}
                    className={cn(
                      "relative rounded-2xl border p-4 text-left transition-all",
                      on ? "border-ink bg-surface-2 ring-1 ring-ink" : "border-line hover:border-line-strong",
                    )}
                  >
                    <span className="block text-3xl leading-none" style={{ fontFamily: FONT_STYLES[f].variable, fontWeight: f === "elegante" ? 400 : 600 }}>
                      Aa · {name.split(" ")[0]}
                    </span>
                    <span className="mt-3 block text-sm font-bold">{FONT_STYLES[f].label}</span>
                    <span className="block text-xs text-muted">{FONT_STYLES[f].hint}</span>
                    {on && <Check className="absolute top-3 right-3 size-4" strokeWidth={3} />}
                  </button>
                );
              })}
            </div>
          </Section>

          <Section title="Tema do cardápio" hint="Como o cardápio abre no celular do cliente. Ele ainda pode trocar entre claro e escuro.">
            <Segmented
              value={theme}
              onChange={(v) => {
                setTheme(v);
                if (v !== "auto") setPreview(v);
              }}
              options={[
                { value: "auto", label: <span className="inline-flex items-center gap-1.5"><MonitorSmartphone className="size-4" /> Automático</span> },
                { value: "light", label: <span className="inline-flex items-center gap-1.5"><Sun className="size-4" /> Claro</span> },
                { value: "dark", label: <span className="inline-flex items-center gap-1.5"><Moon className="size-4" /> Escuro</span> },
              ]}
            />
            <p className="mt-2 text-xs text-muted">Automático segue o celular do cliente. Escuro combina com salões à luz de velas e bares.</p>
          </Section>

          <Section title="Frase de apresentação" hint="Aparece abaixo do nome, na capa do cardápio.">
            <input className={inputClass} maxLength={90} placeholder="Ex.: Massas frescas e vinhos naturais desde 1998." value={tagline} onChange={(e) => setTagline(e.target.value)} />
            <div className="mt-1.5 text-right text-xs text-muted tabular-nums">{tagline.length}/90</div>
          </Section>
        </div>

        {/* Prévia ao vivo */}
        <div className="xl:sticky xl:top-8 xl:self-start">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm font-bold">Prévia ao vivo</span>
            <Segmented
              className="w-40"
              value={preview}
              onChange={setPreview}
              options={[
                { value: "light", label: <Sun className="mx-auto size-4" /> },
                { value: "dark", label: <Moon className="mx-auto size-4" /> },
              ]}
            />
          </div>
          <PhonePreview name={name} logo={logo} cover={cover} tagline={tagline.trim()} primary={primary} font={font} mode={preview} />
          <a href="/demo" target="_blank" className="mt-3 block text-center text-xs font-semibold text-muted hover:text-ink">
            Abrir o cardápio de demonstração completo ↗
          </a>
        </div>
      </div>

      {/* Barra de salvar */}
      <div
        className={cn(
          "fixed inset-x-0 bottom-0 z-40 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] transition-all duration-500 ease-out-expo lg:left-[17rem]",
          dirty || message ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-full opacity-0",
        )}
      >
        <div className="mx-auto flex max-w-3xl flex-wrap items-center gap-3 rounded-2xl border border-line bg-surface p-3 pl-5 shadow-float">
          <p className={cn("min-w-0 flex-1 text-sm", message ? (message.ok ? "text-emerald-700" : "text-red-600 dark:text-red-400") : "text-muted")}>
            {message ? message.text : "Você tem alterações não salvas."}
          </p>
          {dirty && (
            <Button variant="ghost" onClick={reset} disabled={saving}>
              Descartar
            </Button>
          )}
          {dirty && (
            <Button onClick={save} disabled={saving || !!uploading} style={{ ["--brand" as string]: primary, ["--on-brand" as string]: onBrand(primary) }}>
              {saving ? <Spinner /> : "Salvar identidade"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="rounded-[1.4rem] border border-line bg-surface p-5 md:p-6">
      <h2 className="font-display text-xl font-semibold">{title}</h2>
      {hint && <p className="mt-1 max-w-xl text-sm text-muted">{hint}</p>}
      <div className="mt-5">{children}</div>
    </section>
  );
}

function UploadTile({
  label,
  hint,
  busy,
  onFile,
  onClear,
  children,
  className,
  wide,
}: {
  label: string;
  hint: string;
  busy: boolean;
  onFile: (f: File) => void;
  onClear?: () => void;
  children: ReactNode;
  className?: string;
  wide?: boolean;
}) {
  return (
    <div className={className}>
      <label className={cn("group relative block cursor-pointer overflow-hidden rounded-2xl border border-line bg-surface-2", wide ? "aspect-[16/7]" : "aspect-square")}>
        {children}
        <span className="absolute inset-0 flex items-center justify-center bg-black/45 text-sm font-semibold text-white opacity-0 transition-opacity group-hover:opacity-100">
          {busy ? <Spinner /> : "Trocar imagem"}
        </span>
        {busy && <span className="absolute inset-0 flex items-center justify-center bg-black/45 text-white"><Spinner /></span>}
        <input type="file" accept="image/*" className="sr-only" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
      </label>
      <div className="mt-2 flex items-start justify-between gap-2">
        <div>
          <div className="text-sm font-semibold">{label}</div>
          <div className="text-xs text-muted">{hint}</div>
        </div>
        {onClear && (
          <button type="button" onClick={onClear} className="rounded-full p-1.5 text-muted transition hover:bg-red-50 hover:text-red-600 dark:hover:text-red-400" aria-label={`Remover ${label}`}>
            <Trash2 className="size-4" />
          </button>
        )}
      </div>
    </div>
  );
}

/** Miniatura do cardápio do cliente dentro de um celular, com a marca sendo editada. */
function PhonePreview({
  name,
  logo,
  cover,
  tagline,
  primary,
  font,
  mode,
}: {
  name: string;
  logo: string | null;
  cover: string | null;
  tagline: string;
  primary: string;
  font: FontStyle;
  mode: "light" | "dark";
}) {
  const coverSrc = cover ?? SAMPLE("1414235077428-338989a2e8c0");
  return (
    <div className="mx-auto w-[20rem] rounded-[2.9rem] bg-[#111] p-2.5 shadow-float ring-1 ring-black/10">
      <div className="relative h-[40rem] overflow-hidden rounded-[2.3rem]">
        <BrandScope branding={{ primary: primary || BM_ORANGE, font }} theme={mode} className="block h-full overflow-hidden text-[13px] transition-colors duration-500">
          <div className="relative h-44 shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={coverSrc} alt="" className="size-full object-cover [mask-image:linear-gradient(to_bottom,black_50%,transparent)]" />
            <span className="absolute top-2 left-1/2 h-5 w-20 -translate-x-1/2 rounded-full bg-black" />
          </div>
          <div className="relative -mt-14 px-4">
            <RestaurantLogo name={name} url={logo} className="size-14 rounded-2xl text-2xl shadow-float ring-4 ring-canvas" />
            <div className="mt-2.5 font-display text-[1.65rem] leading-[1.05] font-semibold tracking-tight">{name}</div>
            {tagline && <p className="mt-1 line-clamp-2 text-xs text-muted">{tagline}</p>}
            <div className="mt-3 flex items-center gap-1.5">
              <span className="rounded-full border border-line bg-surface px-2.5 py-1 text-[11px]">
                Mesa <strong className="font-display">7</strong>
              </span>
              <span className="flex-1" />
              <span className="inline-flex items-center gap-1 rounded-full bg-brand px-2.5 py-1.5 text-[11px] font-bold text-on-brand">
                <Bell className="size-3" /> Garçom
              </span>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-1.5 border-b border-line px-4 pb-2.5">
            <span className="flex size-7 items-center justify-center rounded-full border border-line bg-surface">
              <Search className="size-3" />
            </span>
            <span className="rounded-full bg-ink px-3 py-1 text-[11px] font-semibold text-canvas">Entradas</span>
            <span className="px-2 text-[11px] font-semibold text-muted">Pratos</span>
            <span className="px-2 text-[11px] font-semibold text-muted">Bebidas</span>
          </div>
          <div className="mt-3 flex items-center gap-1.5 px-4 font-display text-base font-semibold">
            <Sparkles className="size-3.5 text-brand-fg" /> Destaques da casa
          </div>
          <div className="mt-2 flex gap-2 overflow-hidden px-4">
            {["1600891964092-4316c288032e", "1563379926898-05f4575a45d8"].map((id, i) => (
              <div key={id} className="relative aspect-[4/5] w-32 shrink-0 overflow-hidden rounded-2xl text-white">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={SAMPLE(id)} alt="" className="absolute inset-0 size-full object-cover" />
                <span className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                <span className="absolute inset-x-0 bottom-0 p-2.5">
                  <span className="block font-display text-sm leading-tight font-semibold">{i ? "Spaghetti de camarão" : "Bife ancho na brasa"}</span>
                  <span className="mt-1 flex items-center justify-between text-[11px] font-semibold">
                    {i ? "R$ 89,00" : "R$ 119,00"}
                    <span className="flex size-6 items-center justify-center rounded-full bg-white text-black">
                      <Plus className="size-3" strokeWidth={3} />
                    </span>
                  </span>
                </span>
              </div>
            ))}
          </div>
          <div className="mt-4 px-4 font-display text-lg font-semibold">Entradas</div>
          <div className="flex gap-3 px-4 py-2.5">
            <div className="min-w-0 flex-1">
              <div className="font-bold">Tartare de salmão</div>
              <div className="line-clamp-2 text-[11px] text-muted">Salmão curado, ovas, abacate e crocante de arroz.</div>
              <div className="mt-1 font-bold">R$ 58,00</div>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={SAMPLE("1625944525533-473f1a3d54e7")} alt="" className="size-16 rounded-xl object-cover" />
          </div>
          <div className="mx-4 h-px bg-line" />
          <div className="flex gap-3 px-4 py-2.5">
            <div className="min-w-0 flex-1">
              <div className="font-bold">Salada da horta</div>
              <div className="line-clamp-1 text-[11px] text-muted">Folhas do dia e legumes tostados.</div>
              <div className="mt-1 font-bold">R$ 36,00</div>
            </div>
            <span className="flex size-16 items-center justify-center rounded-xl bg-brand-soft text-brand-fg">
              <UtensilsCrossed className="size-5" />
            </span>
          </div>
          <div className="absolute inset-x-3 bottom-[4.1rem] flex h-11 items-center gap-2 rounded-2xl bg-brand pr-3 pl-1.5 text-on-brand shadow-float">
            <span className="flex size-8 items-center justify-center rounded-xl bg-black/15 text-xs font-bold">2</span>
            <span className="flex-1 text-xs font-bold">Ver pedido</span>
            <span className="text-xs font-bold">R$ 208,00</span>
          </div>
          <div className="absolute inset-x-0 bottom-0 flex h-14 items-center justify-around border-t border-line bg-surface/90 text-[10px] font-semibold text-muted backdrop-blur">
            <span className="flex flex-col items-center gap-0.5 text-brand-fg">
              <UtensilsCrossed className="size-4" />
              Cardápio
            </span>
            <span>Pedidos</span>
            <span>Conta</span>
          </div>
        </BrandScope>
      </div>
    </div>
  );
}
