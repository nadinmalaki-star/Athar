export type AuthStackParamList = {
  Welcome: undefined;
  SignIn: undefined;
  SignUpOwner: undefined;
  SignUpCustomer: undefined;
};

export type OwnerStackParamList = {
  CustomersList: undefined;
  CustomerDetail: { customerId: string; customerName: string };
  Explain: { customerId: string; customerName: string };
};

export type SalonsStackParamList = {
  SalonList: undefined;
  Services: { organizationId: string; organizationName: string };
  BookService: { organizationId: string; organizationName: string; serviceId: string; serviceName: string; priceCents: number; durationMinutes: number };
};

export type CustomerTabParamList = {
  SalonsTab: undefined;
  MyBookingsTab: undefined;
};
