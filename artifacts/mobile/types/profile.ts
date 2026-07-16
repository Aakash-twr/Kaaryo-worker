export interface ProfileExpertiseSubcategory {
  key: string;
  name: string;
  active: boolean;
}

export interface ProfileExpertiseCategory {
  category: string;
  name: string;
  active: boolean;
  subcategories: ProfileExpertiseSubcategory[];
}

export interface ProfileData {
  fullName: string;
  city: string;
  photoUrl: string | null;
  displayInitial: string;
  rating: number | null;
  jobsCompleted: number;
  expertise: ProfileExpertiseCategory[];
  account: {
    serviceArea: string;
    phone: string;
  };
}
