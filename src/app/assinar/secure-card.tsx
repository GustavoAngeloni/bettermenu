"use client";

import { CreditCard, Lock } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTheme } from "@/components/theme";
import { Button, cn, Field, inputClass, Spinner } from "@/components/ui";
import { formatBRL } from "@/lib/money";

// Checkout Transparente do Mercado Pago com "Secure Fields": número, validade e CVV são iframes do
// Mercado Pago (o Better Menu nunca vê esses dados); nome e documento são campos nossos.
// O resultado é um token de cartão, usado no servidor para criar a assinatura.

export interface CardResult {
  token: string;
  payer?: { email?: string; identification?: { type?: string; number?: string } };
}

interface MPField {
  mount: (id: string) => void;
  unmount: () => void;
  on: (event: string, cb: (arg: { bin?: string; errorMessages?: { message: string }[] }) => void) => void;
  update: (p: Record<string, unknown>) => void;
}
interface MPInstance {
  fields: {
    create: (name: string, options?: Record<string, unknown>) => MPField;
    createCardToken: (data: { cardholderName: string; identificationType: string; identificationNumber: string }) => Promise<{ id: string } | undefined>;
  };
  getIdentificationTypes: () => Promise<{ id: string; name: string; min_length: number; max_length: number }[]>;
  getPaymentMethods: (p: { bin: string }) => Promise<{
    results: { id: string; name: string; thumbnail?: string; secure_thumbnail?: string; settings?: { security_code?: { length: number; mode?: string } }[] }[];
  }>;
}

declare global {
  interface Window {
    MercadoPago?: new (key: string, opts?: { locale?: string }) => MPInstance;
  }
}

function loadSdk() {
  if (window.MercadoPago) return Promise.resolve();
  return new Promise<void>((resolve, reject) => {
    const existing = document.getElementById("mp-sdk") as HTMLScriptElement | null;
    const s = existing ?? document.createElement("script");
    s.id = "mp-sdk";
    s.src = "https://sdk.mercadopago.com/js/v2";
    s.addEventListener("load", () => resolve());
    s.addEventListener("error", () => reject(new Error("sdk")));
    if (!existing) document.head.appendChild(s);
  });
}

const onlyDigits = (v: string) => v.replace(/\D/g, "");
function maskDoc(type: string, v: string) {
  const d = onlyDigits(v);
  if (type === "CNPJ") return d.slice(0, 14).replace(/^(\d{2})(\d)/, "$1.$2").replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3").replace(/\.(\d{3})(\d)/, ".$1/$2").replace(/(\d{4})(\d)/, "$1-$2");
  return d.slice(0, 11).replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

export function SecureCardForm({
  publicKey,
  amount,
  email,
  submitLabel,
  onSubmit,
}: {
  publicKey: string;
  amount: number;
  email: string;
  submitLabel: string;
  onSubmit: (card: CardResult) => Promise<void>;
}) {
  const [mode] = useTheme();
  const mp = useRef<MPInstance | null>(null);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [focused, setFocused] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [brand, setBrand] = useState<{ name: string; thumb?: string } | null>(null);
  const [docTypes, setDocTypes] = useState<{ id: string; name: string }[]>([{ id: "CPF", name: "CPF" }]);
  const [holder, setHolder] = useState("");
  const [docType, setDocType] = useState("CPF");
  const [doc, setDoc] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!publicKey) return;
    let cancelled = false;
    const mounted: MPField[] = [];
    const dark = mode === "dark";
    const style = { fontSize: "16px", fontFamily: "Manrope, system-ui, sans-serif", color: dark ? "#f4efe9" : "#211a16", placeholderColor: dark ? "#8a7f77" : "#9b918a" };

    (async () => {
      await loadSdk();
      if (cancelled || !window.MercadoPago) return;
      const instance = new window.MercadoPago(publicKey, { locale: "pt-BR" });
      mp.current = instance;
      const make = (name: string, id: string, placeholder: string, extra: Record<string, unknown> = {}) => {
        const f = instance.fields.create(name, { placeholder, style, ...extra });
        f.mount(id);
        f.on("focus", () => setFocused(name));
        f.on("blur", () => setFocused((cur) => (cur === name ? null : cur)));
        f.on("validityChange", (arg) => setFieldErrors((e) => ({ ...e, [name]: arg.errorMessages?.length ? "inválido" : "" })));
        mounted.push(f);
        return f;
      };
      const number = make("cardNumber", "mp-card-number", "0000 0000 0000 0000");
      make("expirationDate", "mp-card-exp", "MM/AA", { mode: "short" });
      const cvv = make("securityCode", "mp-card-cvv", "123");
      number.on("ready", () => !cancelled && setReady(true));
      number.on("binChange", async ({ bin }) => {
        if (!bin) return setBrand(null);
        try {
          const { results } = await instance.getPaymentMethods({ bin });
          const pm = results[0];
          if (!pm) return setBrand(null);
          setBrand({ name: pm.name, thumb: pm.secure_thumbnail ?? pm.thumbnail });
          const sc = pm.settings?.[0]?.security_code;
          if (sc) cvv.update({ settings: { mode: sc.mode ?? "mandatory", length: sc.length } });
        } catch {}
      });
      instance
        .getIdentificationTypes()
        .then((types) => !cancelled && types.length && setDocTypes(types.map((t) => ({ id: t.id, name: t.name }))))
        .catch(() => {});
    })().catch(() => !cancelled && setLoadError("Não foi possível carregar o pagamento seguro. Verifique a conexão e recarregue a página."));

    return () => {
      cancelled = true;
      mounted.forEach((f) => {
        try {
          f.unmount();
        } catch {}
      });
    };
  }, [publicKey, mode]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (holder.trim().length < 3) return setError("Informe o nome como está impresso no cartão.");
    if (onlyDigits(doc).length < (docType === "CNPJ" ? 14 : 11)) return setError(`Informe o ${docType} do titular do cartão.`);
    if (!mp.current) return;
    setBusy(true);
    try {
      const token = await mp.current.fields.createCardToken({ cardholderName: holder.trim(), identificationType: docType, identificationNumber: onlyDigits(doc) });
      if (!token?.id) throw new Error("token");
      await onSubmit({ token: token.id, payer: { email, identification: { type: docType, number: onlyDigits(doc) } } });
    } catch (err) {
      // erros do servidor já aparecem acima; aqui só os do cartão
      if (!(err instanceof Error && err.message && err.message !== "token")) {
        setError("Confira os dados do cartão: número, validade e código de segurança.");
      }
    } finally {
      setBusy(false);
    }
  }

  const box = (name: string) =>
    cn(
      "h-12 rounded-xl border bg-surface px-3.5 transition-[border-color,box-shadow]",
      focused === name ? "border-brand ring-4 ring-brand/15" : fieldErrors[name] ? "border-red-400" : "border-line-strong",
    );

  return (
    <form onSubmit={submit} className="space-y-4 rounded-[1.4rem] border border-line bg-surface p-5" noValidate>
      <div className="flex items-center justify-between gap-3">
        <span className="flex items-center gap-2 text-sm font-semibold">
          <CreditCard className="size-4 text-brand-fg" /> Cartão de crédito
        </span>
        {brand ? (
          <span className="flex items-center gap-1.5 text-xs font-semibold text-muted">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {brand.thumb && <img src={brand.thumb} alt="" className="h-5" />} {brand.name}
          </span>
        ) : (
          <span className="flex items-center gap-1 text-xs text-muted">
            <Lock className="size-3.5" /> Ambiente seguro
          </span>
        )}
      </div>
      {loadError && <p className="text-sm text-red-700">{loadError}</p>}
      <div className={cn("space-y-4", !ready && !loadError && "pointer-events-none opacity-50")}>
        <Field label="Número do cartão">
          <div id="mp-card-number" className={box("cardNumber")} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Validade">
            <div id="mp-card-exp" className={box("expirationDate")} />
          </Field>
          <Field label="Código de segurança">
            <div id="mp-card-cvv" className={box("securityCode")} />
          </Field>
        </div>
        <Field label="Nome impresso no cartão">
          <input className={inputClass} value={holder} onChange={(e) => setHolder(e.target.value.toUpperCase())} autoComplete="cc-name" placeholder="MARINA COSTA" />
        </Field>
        <div className="grid grid-cols-[7rem_1fr] gap-3">
          <Field label="Documento">
            <select className={inputClass} value={docType} onChange={(e) => setDocType(e.target.value)}>
              {docTypes.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label={`${docType} do titular`}>
            <input className={inputClass} inputMode="numeric" value={doc} onChange={(e) => setDoc(maskDoc(docType, e.target.value))} placeholder={docType === "CNPJ" ? "00.000.000/0000-00" : "000.000.000-00"} />
          </Field>
        </div>
      </div>
      {!ready && !loadError && (
        <p className="flex items-center gap-2 text-sm text-muted">
          <Spinner className="size-4" /> Carregando o pagamento seguro...
        </p>
      )}
      {error && (
        <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm font-medium text-red-700">
          {error}
        </p>
      )}
      <Button type="submit" size="lg" className="w-full" disabled={!ready || busy}>
        {busy ? <Spinner /> : `${submitLabel} · ${formatBRL(amount)}`}
      </Button>
      <p className="text-center text-xs text-muted">Processado pelo Mercado Pago. Seus dados de cartão não são armazenados pelo Better Menu.</p>
    </form>
  );
}
