// Bee Code · lógica compartida de formularios (home y /cotizar).
// Validación, normalización de WhatsApp, origen de la visita, envío a Web3Forms
// y armado del mensaje de WhatsApp para cuando el envío falla.

export const WEB3FORMS_KEY = '316c7807-b0b9-41f7-8d38-ede01ee35149';
export const WEB3FORMS_URL = 'https://api.web3forms.com/submit';
export const WA_NUMBER = '5493816378896';

// Características (códigos de área) de 3 dígitos. El 11 es el único de 2 dígitos;
// el resto de las características argentinas tienen 4 dígitos.
const AREA_3 = new Set([
  '220', '221', '223', '230', '236', '237', '249', '260', '261', '263', '264', '266',
  '280', '291', '294', '297', '298', '299', '336', '341', '342', '343', '345', '348',
  '351', '353', '358', '362', '364', '370', '376', '379', '380', '381', '383', '385',
  '387', '388'
]);

function areaCodeLength(national) {
  if (national.startsWith('11')) return 2;
  if (AREA_3.has(national.slice(0, 3))) return 3;
  return 4;
}

/**
 * Normaliza un WhatsApp argentino a 549XXXXXXXXXX (549 + característica + número, 10 dígitos).
 * Acepta +54 9, 54, 0, 15, espacios, guiones y paréntesis.
 * Si el número empieza con + y otro código de país, lo acepta como internacional.
 * Devuelve { ok: true, value } o { ok: false, error }.
 */
export function normalizeWhatsapp(raw) {
  const input = String(raw ?? '').trim();
  if (!input) return { ok: false, error: 'empty' };

  let digits = input.replace(/\D/g, '');
  const hasPlus = input.startsWith('+');
  if (digits.startsWith('00')) digits = digits.slice(2);

  // Número internacional (por ejemplo, un cliente de otro país)
  if ((hasPlus || input.startsWith('00')) && !digits.startsWith('54')) {
    return digits.length >= 8 && digits.length <= 15
      ? { ok: true, value: digits, international: true }
      : { ok: false, error: 'invalid' };
  }

  if (digits.startsWith('54')) {
    digits = digits.slice(2);
    if (digits.startsWith('9')) digits = digits.slice(1);
  }
  if (digits.startsWith('0')) digits = digits.slice(1);

  // Quitar el 15 que va después de la característica
  if (digits.length === 12) {
    const k = areaCodeLength(digits);
    if (digits.slice(k, k + 2) === '15') digits = digits.slice(0, k) + digits.slice(k + 2);
  }

  if (digits.length !== 10 || !/^[123]/.test(digits)) return { ok: false, error: 'invalid' };
  return { ok: true, value: '549' + digits };
}

export const MESSAGES = {
  nombre: 'Escribí tu nombre así sé cómo llamarte.',
  whatsappEmpty: 'Dejame tu WhatsApp así te respondo.',
  whatsappInvalid: 'Revisá el número: tiene que tener la característica y el número, por ejemplo 381 123 4567.',
  emailEmpty: 'Dejame tu email.',
  emailInvalid: 'Revisá el email, parece que le falta algo.',
  servicio: 'Elegí qué necesitás.',
  tipo: 'Elegí una opción.',
  envio: 'No se pudo enviar. Mandámelo por WhatsApp y te respondo igual.'
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function validateNombre(v) {
  return String(v ?? '').trim().length >= 2 ? null : MESSAGES.nombre;
}

export function validateWhatsapp(v) {
  const r = normalizeWhatsapp(v);
  if (r.ok) return null;
  return r.error === 'empty' ? MESSAGES.whatsappEmpty : MESSAGES.whatsappInvalid;
}

export function validateEmail(v, { required = false } = {}) {
  const s = String(v ?? '').trim();
  if (!s) return required ? MESSAGES.emailEmpty : null;
  return EMAIL_RE.test(s) ? null : MESSAGES.emailInvalid;
}

export function validateRequiredChoice(v, message) {
  return String(v ?? '').trim() ? null : message;
}

/**
 * Calcula el origen de la visita a partir de datos crudos (función pura, testeable).
 * Si no hay utm_source y el referrer o el navegador indican Instagram, el origen es "instagram".
 */
export function computeOrigin({ search = '', referrer = '', userAgent = '' } = {}) {
  const params = new URLSearchParams(search);
  const utm_source = params.get('utm_source') || '';
  const utm_medium = params.get('utm_medium') || '';
  const utm_campaign = params.get('utm_campaign') || '';
  const instagramBrowser = /Instagram/i.test(userAgent);
  const instagramReferrer = /(^|\.)instagram\.com/i.test(hostOf(referrer));
  let origen = utm_source;
  if (!origen) {
    if (instagramReferrer || instagramBrowser) origen = 'instagram';
    else if (referrer) origen = hostOf(referrer) || 'referrer';
    else origen = 'directo';
  }
  return { origen, utm_source, utm_medium, utm_campaign, referrer, instagramBrowser };
}

function hostOf(url) {
  try { return new URL(url).hostname; } catch { return ''; }
}

const ORIGIN_KEY = 'beecode:origen';

/**
 * Guarda el origen de la primera página que se visita en la sesión, para no perder
 * los UTM si la persona entra por la home y después va a /cotizar.
 */
export function captureOrigin() {
  const current = computeOrigin({
    search: window.location.search,
    referrer: document.referrer,
    userAgent: navigator.userAgent
  });
  try {
    const stored = JSON.parse(sessionStorage.getItem(ORIGIN_KEY) || 'null');
    const hasNewCampaign = Boolean(current.utm_source);
    if (stored && !hasNewCampaign) return stored;
    sessionStorage.setItem(ORIGIN_KEY, JSON.stringify(current));
  } catch {
    // sessionStorage puede no estar disponible (modo privado, navegadores internos)
  }
  return current;
}

/** Campos de origen tal como aparecen en el mail. */
export function originFields(o) {
  return {
    'Origen': o.origen,
    'UTM source': o.utm_source || '-',
    'UTM medium': o.utm_medium || '-',
    'UTM campaign': o.utm_campaign || '-',
    'Referrer': o.referrer || '-',
    'Navegador de Instagram': o.instagramBrowser ? 'Sí' : 'No',
    'Página': window.location.pathname
  };
}

export function waUrl(text) {
  return `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(text)}`;
}

export function firstName(nombre) {
  return String(nombre ?? '').trim().split(/\s+/)[0] || '';
}

/**
 * Envía a Web3Forms. `fields` son los campos visibles en el mail.
 * Lanza un error si el envío no fue aceptado.
 */
export async function sendToWeb3Forms({ subject, fields, replyTo }) {
  const body = {
    access_key: WEB3FORMS_KEY,
    subject,
    from_name: 'beecodelab.com',
    ...fields
  };
  if (replyTo) body.replyto = replyTo;
  const res = await fetch(WEB3FORMS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(body)
  });
  let json = {};
  try { json = await res.json(); } catch { /* respuesta vacía */ }
  if (!res.ok || !json.success) throw new Error(json.message || `HTTP ${res.status}`);
  return json;
}

/** Muestra u oculta el error de un campo, con aria-invalid y aria-describedby. */
export function setFieldError(form, name, message) {
  const box = form.querySelector(`[data-error-for="${name}"]`);
  const controls = form.querySelectorAll(`[name="${name}"]`);
  controls.forEach(el => {
    if (message) el.setAttribute('aria-invalid', 'true');
    else el.removeAttribute('aria-invalid');
  });
  if (box) {
    box.textContent = message || '';
    box.hidden = !message;
  }
}

/** Valida según un mapa { campo: fn(valor) => mensaje|null }. Devuelve el primer campo con error. */
export function validateForm(form, rules) {
  const data = Object.fromEntries(new FormData(form).entries());
  let firstInvalid = null;
  for (const [name, rule] of Object.entries(rules)) {
    const msg = rule(data[name]);
    setFieldError(form, name, msg);
    if (msg && !firstInvalid) firstInvalid = name;
  }
  return { data, firstInvalid };
}

/** Revalida un campo cuando la persona lo corrige, sin molestar mientras escribe por primera vez. */
export function liveValidation(form, rules) {
  for (const [name, rule] of Object.entries(rules)) {
    form.querySelectorAll(`[name="${name}"]`).forEach(el => {
      const evt = el.type === 'radio' || el.tagName === 'SELECT' ? 'change' : 'blur';
      el.addEventListener(evt, () => {
        const value = new FormData(form).get(name);
        setFieldError(form, name, rule(value));
      });
      el.addEventListener('input', () => {
        if (el.getAttribute('aria-invalid') === 'true') {
          setFieldError(form, name, rule(new FormData(form).get(name)));
        }
      });
    });
  }
}

export function focusField(form, name) {
  const el = form.querySelector(`[name="${name}"]:checked`) || form.querySelector(`[name="${name}"]`);
  if (el) el.focus();
}
