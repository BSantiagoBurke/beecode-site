// Formulario de contacto de la home.
import {
  MESSAGES, normalizeWhatsapp, validateNombre, validateWhatsapp, validateEmail,
  validateRequiredChoice, captureOrigin, originFields, sendToWeb3Forms, waUrl,
  validateForm, liveValidation, focusField
} from './form-core.js';

const formCard = document.getElementById('formCard');
const form = document.getElementById('contactForm');

if (form && formCard) {
  const submitBtn = document.getElementById('formSubmit');
  const formError = document.getElementById('formError');
  const submitLabels = { propuesta: 'Pedir mi propuesta →', llamada: 'Coordinar la llamada →' };
  const origin = captureOrigin();

  const rules = {
    nombre: validateNombre,
    whatsapp: validateWhatsapp,
    email: v => validateEmail(v, { required: true }),
    tipo: v => validateRequiredChoice(v, MESSAGES.tipo)
  };
  liveValidation(form, rules);

  const setIntent = (intent) => {
    formCard.dataset.intent = intent;
    const radio = form.querySelector(`input[name="intent"][value="${intent}"]`);
    if (radio) radio.checked = true;
    submitBtn.textContent = submitLabels[intent];
  };
  form.querySelectorAll('input[name="intent"]').forEach(r => r.addEventListener('change', () => setIntent(r.value)));

  // "Agendar una llamada" y "Contacto" llevan al formulario en el modo que corresponde
  document.querySelectorAll('a[data-intent]').forEach(link => {
    link.addEventListener('click', () => {
      setIntent(link.dataset.intent);
      setTimeout(() => document.getElementById('fNombre').focus({ preventScroll: true }), 700);
    });
  });

  const buildWaText = (d) => {
    const lines = [
      d.intent === 'llamada' ? 'Hola Santiago! Quiero coordinar una llamada.' : 'Hola Santiago! Quiero pedir una propuesta.',
      `Nombre: ${d.nombre}`, `Email: ${d.email}`, `WhatsApp: ${d.whatsapp}`, `Necesito: ${d.tipo}`
    ];
    if (d.mensaje) lines.push(`Proyecto: ${d.mensaje}`);
    if (d.intent === 'llamada' && d.horario) lines.push(`Horarios: ${d.horario}`);
    return lines.join('\n');
  };

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    formError.classList.remove('show');

    const { data: d, firstInvalid } = validateForm(form, rules);
    if (firstInvalid) {
      focusField(form, firstInvalid);
      return;
    }
    if (d.botcheck) return;

    const intent = d.intent === 'llamada' ? 'llamada' : 'propuesta';
    const wa = normalizeWhatsapp(d.whatsapp).value;
    const fields = {
      'Motivo': intent === 'llamada' ? 'Coordinar una llamada' : 'Quiere una propuesta',
      'Nombre': d.nombre.trim(),
      'WhatsApp': wa,
      'WhatsApp (link)': `https://wa.me/${wa}`,
      'Email': d.email.trim(),
      'Qué necesita': d.tipo,
      'Proyecto': d.mensaje?.trim() || '-'
    };
    if (intent === 'llamada') fields['Horarios'] = d.horario?.trim() || '-';
    Object.assign(fields, originFields(origin));

    const subject = `[Contacto] ${intent === 'llamada' ? 'Llamada' : 'Propuesta'} · ${d.tipo} · ${d.nombre.trim()}`;
    const fallbackUrl = waUrl(buildWaText(d));

    submitBtn.disabled = true;
    submitBtn.textContent = 'Enviando...';
    try {
      await sendToWeb3Forms({ subject, fields, replyTo: d.email.trim() });
      form.reset();
      setIntent('propuesta');
      formCard.classList.add('sent');
    } catch {
      formError.textContent = 'No se pudo enviar. ';
      const a = document.createElement('a');
      a.href = fallbackUrl;
      a.target = '_blank';
      a.rel = 'noopener';
      a.textContent = 'Mandámelo por WhatsApp';
      formError.append(a, ' y te respondo igual.');
      formError.classList.add('show');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = submitLabels[formCard.dataset.intent];
    }
  });
}
