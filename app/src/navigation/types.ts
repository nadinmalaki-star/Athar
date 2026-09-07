export type AuthStackParamList = {
  Welcome: undefined;
  SignIn: undefined;
  SignUpOwner: undefined;
  SignUpCustomer: undefined;
};

export type CustomersStackParamList = {
  CustomersList: undefined;
  CustomerDetail: { customerId: string; customerName: string };
  Explain: { customerId: string; customerName: string };
};

export type OwnerTabParamList = {
  CustomersTab: undefined;
  CalendarTab: undefined;
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
