/** Catálogo canónico de objetivos operativos FAQ Inn. */

export const OBJECTIVES = [
  {
    slug: 'reservar_horarios',
    name: 'Agendar horarios',
    description: 'Turnos y citas con motor de agenda',
    examples: 'barbería, salón, spa, dentista',
    motor: 'agenda',
    needs_destination_url: false,
    needs_booking_motor: false,
  },
  {
    slug: 'reservar_noches',
    name: 'Reservar noches',
    description: 'Alojamiento con motor de reservas',
    examples: 'hotel, posada, hostal',
    motor: 'reservas',
    needs_destination_url: false,
    needs_booking_motor: true,
  },
  {
    slug: 'enviar_a_sitio_web',
    name: 'Llevar a un sitio web',
    description: 'Derivar al sitio del negocio',
    examples: 'catálogo, landing, tienda online',
    motor: null,
    needs_destination_url: true,
    needs_booking_motor: false,
  },
  {
    slug: 'responder_preguntas',
    name: 'Solo responder preguntas',
    description: 'Asistente informativo sin reservas ni derivación web',
    examples: 'cualquier rubro informativo',
    motor: null,
    needs_destination_url: false,
    needs_booking_motor: false,
  },
];

const BY_SLUG = new Map(OBJECTIVES.map((o) => [o.slug, o]));

export const OBJECTIVE_SLUGS = OBJECTIVES.map((o) => o.slug);

/** Objetivos comerciales excluyentes (FAQ es transversal para todos). */
export const PRIMARY_OBJECTIVE_SLUGS = [
  'reservar_horarios',
  'reservar_noches',
  'enviar_a_sitio_web',
];

export function isPrimaryObjectiveSlug(slug) {
  return PRIMARY_OBJECTIVE_SLUGS.includes(String(slug || '').trim());
}

export function getObjective(slug) {
  return BY_SLUG.get(String(slug || '').trim()) || null;
}

export function isValidObjectiveSlug(slug) {
  return BY_SLUG.has(String(slug || '').trim());
}
