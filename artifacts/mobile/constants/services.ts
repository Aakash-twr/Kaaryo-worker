export interface ServiceCategory {
  id: string;
  name: string;
  icon: string;
  color: string;
  lightColor: string;
  description: string;
}

export const SERVICE_CATEGORIES: ServiceCategory[] = [
  { id: "cleaning", name: "Cleaning", icon: "droplet", color: "#3B82F6", lightColor: "#DBEAFE", description: "House & deep cleaning" },
  { id: "electrical", name: "Electrical", icon: "zap", color: "#F59E0B", lightColor: "#FEF3C7", description: "Wiring, repairs & fittings" },
  { id: "cooking", name: "Cooking", icon: "coffee", color: "#EF4444", lightColor: "#FEE2E2", description: "Meal prep & events" },
  { id: "plumbing", name: "Plumbing", icon: "tool", color: "#8B5CF6", lightColor: "#EDE9FE", description: "Leaks & pipe installation" },
  { id: "carpentry", name: "Carpentry", icon: "layout", color: "#92400E", lightColor: "#FDE68A", description: "Furniture & wood repairs" },
  { id: "ac_repair", name: "AC Repair", icon: "wind", color: "#06B6D4", lightColor: "#CFFAFE", description: "Installation & servicing" },
  { id: "painting", name: "Painting", icon: "edit-2", color: "#10B981", lightColor: "#D1FAE5", description: "Interior & exterior" },
  { id: "pest_control", name: "Pest Control", icon: "shield", color: "#6366F1", lightColor: "#E0E7FF", description: "Fumigation & treatment" },
];

export const getServiceById = (id: string): ServiceCategory | undefined =>
  SERVICE_CATEGORIES.find((s) => s.id === id);

export interface MockJob {
  id: string;
  serviceType: string;
  customerName: string;
  customerRating: number;
  address: string;
  landmark: string;
  distance: string;
  scheduledDate: string;
  scheduledTime: string;
  price: number;
  platformFee: number;
  duration: string;
  status: "pending" | "accepted" | "active" | "completed" | "rejected" | "cancelled";
  description: string;
  items: string[];
  createdAt: string;
  workerRating?: number;
  customerReview?: string;
}

export const MOCK_JOBS: MockJob[] = [
  {
    id: "job_001",
    serviceType: "cleaning",
    customerName: "Priya Sharma",
    customerRating: 4.7,
    address: "42, Koramangala 4th Block",
    landmark: "Near Forum Mall",
    distance: "1.2 km",
    scheduledDate: "Today",
    scheduledTime: "11:00 AM",
    price: 649,
    platformFee: 65,
    duration: "2 hrs",
    status: "pending",
    description: "2BHK deep cleaning. Kitchen and bathrooms need extra attention. Have a pet dog.",
    items: ["Mop & Broom", "Cleaning Liquid", "Vacuum cleaner"],
    createdAt: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
  },
  {
    id: "job_002",
    serviceType: "electrical",
    customerName: "Rahul Gupta",
    customerRating: 4.2,
    address: "15, Indiranagar 100ft Road",
    landmark: "Opp. Leela Palace",
    distance: "3.4 km",
    scheduledDate: "Today",
    scheduledTime: "2:00 PM",
    price: 499,
    platformFee: 50,
    duration: "1 hr",
    status: "pending",
    description: "3 ceiling fans not working. Probably wiring issue in one room.",
    items: ["Electrical tape", "Tester", "Spare wire"],
    createdAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
  },
  {
    id: "job_003",
    serviceType: "plumbing",
    customerName: "Anita Menon",
    customerRating: 4.9,
    address: "8, Jayanagar 3rd Block",
    landmark: "Near BDA Complex",
    distance: "2.1 km",
    scheduledDate: "Today",
    scheduledTime: "4:30 PM",
    price: 399,
    platformFee: 40,
    duration: "1 hr",
    status: "accepted",
    description: "Kitchen sink drain is blocked. Water not draining at all.",
    items: ["Plunger", "Drain cleaner", "Pipe wrench"],
    createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
  },
  {
    id: "job_004",
    serviceType: "ac_repair",
    customerName: "Vikram Nair",
    customerRating: 4.5,
    address: "23, HSR Layout Sector 6",
    landmark: "Next to BDA Park",
    distance: "4.8 km",
    scheduledDate: "Tomorrow",
    scheduledTime: "10:00 AM",
    price: 799,
    platformFee: 80,
    duration: "2 hrs",
    status: "accepted",
    description: "Split AC 1.5 ton Voltas not cooling. Needs gas refill and general service.",
    items: ["Gas cylinder", "Pressure gauge", "Cleaning cloth"],
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "job_005",
    serviceType: "cleaning",
    customerName: "Sunita Patel",
    customerRating: 4.6,
    address: "67, Whitefield Main Road",
    landmark: "Near ITPL Gate 2",
    distance: "6.2 km",
    scheduledDate: "Yesterday",
    scheduledTime: "9:00 AM",
    price: 849,
    platformFee: 85,
    duration: "3 hrs",
    status: "completed",
    description: "Post renovation deep cleaning for 3BHK.",
    items: ["Vacuum", "Mop", "Cleaning agents"],
    createdAt: new Date(Date.now() - 26 * 60 * 60 * 1000).toISOString(),
    workerRating: 5,
    customerReview: "Excellent work! Very thorough and professional.",
  },
  {
    id: "job_006",
    serviceType: "electrical",
    customerName: "Deepak Joshi",
    customerRating: 4.3,
    address: "11, BTM Layout 2nd Stage",
    landmark: "Near Silk Board Junction",
    distance: "2.9 km",
    scheduledDate: "2 days ago",
    scheduledTime: "3:00 PM",
    price: 349,
    platformFee: 35,
    duration: "45 min",
    status: "completed",
    description: "MCB tripping issue. Needs inspection and replacement.",
    items: ["MCB", "Multimeter"],
    createdAt: new Date(Date.now() - 50 * 60 * 60 * 1000).toISOString(),
    workerRating: 4,
    customerReview: "Good service, fixed the problem quickly.",
  },
];

export const EARNINGS_DATA = {
  today: { amount: 1248, jobs: 2 },
  week: {
    total: 6840,
    jobs: 11,
    days: [
      { day: "Mon", amount: 849 },
      { day: "Tue", amount: 1248 },
      { day: "Wed", amount: 699 },
      { day: "Thu", amount: 1099 },
      { day: "Fri", amount: 1248 },
      { day: "Sat", amount: 1497 },
      { day: "Sun", amount: 200 },
    ],
  },
  month: { total: 28450, jobs: 46 },
};
