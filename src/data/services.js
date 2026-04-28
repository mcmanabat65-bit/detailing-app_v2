export const services = [
  {
    id: 1,
    name: 'The Essential',
    price: 1500,
    duration: '2–3 hrs',
    category: 'exterior',
    inclusions: [
      'Exterior Hand Wash',
      'Tire Dressing',
      'Window Cleaning',
      'Interior Vacuum',
    ],
    popular: false,
  },
  {
    id: 2,
    name: 'The Executive',
    price: 3500,
    duration: '4–5 hrs',
    category: 'full',
    inclusions: [
      'Full Exterior Detail',
      'Clay Bar Treatment',
      'Interior Deep Clean',
      'Dashboard Polish',
      'Leather Conditioning',
      'Engine Bay Cleaning',
    ],
    popular: true,
  },
  {
    id: 3,
    name: 'The Obsidian Elite',
    price: 6000,
    duration: '6–8 hrs',
    category: 'premium',
    inclusions: [
      'Everything in Executive',
      'Paint Correction',
      'Ceramic Coating Prep',
      'Odor Elimination',
      'Headlight Restoration',
      'VIP Lounge Priority',
    ],
    popular: false,
  },
  {
    id: 4,
    name: 'Paint Correction',
    price: 4500,
    duration: '5–6 hrs',
    category: 'specialty',
    inclusions: [
      'Multi-stage paint correction',
      'Swirl mark removal',
      'Oxidation treatment',
      'Final polish & seal',
    ],
    popular: false,
  },
  {
    id: 5,
    name: 'Ceramic Coating',
    price: 12000,
    duration: '1–2 days',
    category: 'specialty',
    inclusions: [
      'Surface decontamination',
      'Paint correction',
      'Professional ceramic coat application',
      '2-year protection warranty',
    ],
    popular: false,
  },
  {
    id: 6,
    name: 'Interior Rescue',
    price: 2500,
    duration: '3–4 hrs',
    category: 'interior',
    inclusions: [
      'Deep vacuum',
      'Shampoo carpets & seats',
      'Steam clean vents',
      'Stain treatment',
      'Deodorize & sanitize',
    ],
    popular: false,
  },
];

export const categoryColors = {
  exterior: '#5B8DEF',
  full: '#00704A',
  premium: '#9B6BFF',
  specialty: '#4CAF7D',
  interior: '#E58E5C',
};

export const formatCurrency = (amount) =>
  new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    maximumFractionDigits: 0,
  }).format(amount);

export const getServiceById = (id) =>
  services.find((s) => s.id === Number(id)) || null;
