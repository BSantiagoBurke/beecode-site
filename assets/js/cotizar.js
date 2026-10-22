// Página /cotizar: destino del botón "Cotizar" y del link de la bio de Instagram.
import {
  MESSAGES, normalizeWhatsapp, validateNombre, validateWhatsapp, validateEmail,
  validateRequiredChoice, captureOrigin, originFields, sendToWeb3Forms, waUrl,
  firstName, validateForm, liveValidation, focusField, setFieldError
} from './form-core.js';

export const SERVICIOS = {
  turnos: 'Sistema de turnos online',
  web: 'Página web para mi negocio',
  tienda: 'Tienda online',
  sistema: 'Sistema o app a medida',
  nose: 'Todavía no lo sé'
};

const card = document.getElementById('quoteCard');
const form = document.getElementById('quoteForm');

if (form && card) {
  const submitBtn = document.getElementById('quoteSubmit');
  const formError = document.getElementById('quoteError');
  const servicioGroup = document.getElementById('servicioGroup');
  const origin = captureOrigin();

  // ?servicio=turnos|web|tienda|sistema deja la opción marcada
  const pre = new URLSearchParams(window.location.search).get('servicio');
  if (pre && SERVICIOS[pre.toLowerCase()]) {
    const radio = form.querySelector(`input[name="servicio"][value="${pre.toLowerCase()}"]`);
    if (radio) radio.checked = true;
  }

  const rules = {
    nombre: validateNombre,
    whatsapp: validateWhatsapp,
    email: v => validateEmail(v, { required: false }),
    servicio: v => validateRequiredChoice(v, MESSAGES.servicio)
  };
  liveValidation(form, rules);

  // El error del grupo de tarjetas también marca el fieldset
  const syncGroupInvalid = () => {
    const invalid = form.querySelector('input[name="servicio"][aria-invalid="true"]');
    if (invalid) servicioGroup.setAttribute('aria-invalid', 'true');
    else servicioGroup.removeAttribute('aria-invalid');
  };
  form.querySelectorAll('input[name="servicio"]').forEach(r => r.addEventListener('change', () => {
    setFieldError(form, 'servicio', null);
    syncGroupInvalid();
  }));

  const clean = v => String(v ?? '').trim();

  const buildWaText = (d, servicio) => {
    const intro = origin.origen === 'instagram'
      ? 'Hola Santiago! Vengo de Instagram y quiero cotizar un proyecto.'
      : 'Hola Santiago! Quiero cotizar un proyecto.';
    const lines = [intro, `Nombre: ${clean(d.nombre)}`, `Necesito: ${servicio}`];
    if (clean(d.negocio)) lines.push(`Negocio: ${clean(d.negocio)}`);
    if (clean(d.rubro)) lines.push(`Rubro: ${clean(d.rubro)}`);
    if (d.presupuesto) lines.push(`Presupuesto: ${d.presupuesto}`);
    if (d.plazo) lines.push(`Para cuándo: ${d.plazo}`);
    if (clean(d.detalle)) lines.push(`Detalle: ${clean(d.detalle)}`);
    return lines.join('\n');
  };

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    formError.classList.remove('show');

    const { data: d, firstInvalid } = validateForm(form, rules);
    syncGroupInvalid();
    if (firstInvalid) {
      focusField(form, firstInvalid);
      return;
    }
    if (d.botcheck) return;

    const servicio = SERVICIOS[d.servicio];
    const negocio = clean(d.negocio);
    const nombre = clean(d.nombre);
    const wa = normalizeWhatsapp(d.whatsapp).value;
    const email = clean(d.email);

    const fields = {
      'Nombre': nombre,
      'WhatsApp': wa,
      'WhatsApp (link)': `https://wa.me/${wa}`,
      'Email': email || '-',
      'Negocio': negocio || '-',
      'Qué necesita': servicio,
      'Rubro': clean(d.rubro) || '-',
      'Presupuesto': d.presupuesto || '-',
      'Para cuándo': d.plazo || '-',
      'Detalle': clean(d.detalle) || '-',
      ...originFields(origin)
    };
    const subject = `[Cotización] ${servicio} · ${negocio || nombre}`;

    submitBtn.disabled = true;
    submitBtn.textContent = 'Enviando...';
    try {
      await sendToWeb3Forms({ subject, fields, replyTo: email || undefined });
      const title = document.getElementById('quoteSuccessTitle');
      title.textContent = `¡Listo, ${firstName(nombre)}!`;
      card.classList.add('sent');
      card.scrollIntoView({ behavior: 'smooth', block: 'start' });
      title.focus({ preventScroll: true });
    } catch {
      formError.textContent = 'No se pudo enviar. ';
      const a = document.createElement('a');
      a.href = waUrl(buildWaText(d, servicio));
      a.target = '_blank';
      a.rel = 'noopener';
      a.textContent = 'Mandámelo por WhatsApp';
      formError.append(a, ' y te respondo igual.');
      formError.classList.add('show');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Pedir cotización';
    }
  });
}
