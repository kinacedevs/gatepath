export const projects = [
  { id: 'p1', name: 'Ruiru Green Gardens', location: 'Ruiru, Kiambu', totalPlots: 80, sold: 52, booked: 14, available: 14 },
  { id: 'p2', name: 'Kiambu Ridge Estate', location: 'Kiambu Town', totalPlots: 60, sold: 38, booked: 8, available: 14 },
  { id: 'p3', name: 'Gatepath Meadows', location: 'Githunguri, Kiambu', totalPlots: 45, sold: 21, booked: 6, available: 18 },
  { id: 'p4', name: 'Tatu Ridge Plots', location: 'Ruiru, off Thika Rd', totalPlots: 100, sold: 44, booked: 18, available: 38 },
];

export const plots = [
  { id: 'pl1', projectId: 'p1', number: 'RGG-001', size: '50×100 ft', acres: 0.115, price: 1_850_000, status: 'sold', titleVerified: true, verifiedBy: 'Wanjiku Kamau', verifiedDate: '2024-11-03', clientName: 'David Otieno' },
  { id: 'pl2', projectId: 'p1', number: 'RGG-002', size: '50×100 ft', acres: 0.115, price: 1_850_000, status: 'sold', titleVerified: false, verifiedBy: null, verifiedDate: null, clientName: 'Mary Njoroge' },
  { id: 'pl3', projectId: 'p1', number: 'RGG-003', size: '50×100 ft', acres: 0.115, price: 1_950_000, status: 'booked', titleVerified: false, verifiedBy: null, verifiedDate: null, clientName: 'James Kariuki' },
  { id: 'pl4', projectId: 'p1', number: 'RGG-004', size: '50×100 ft', acres: 0.115, price: 1_850_000, status: 'available', titleVerified: null, verifiedBy: null, verifiedDate: null, clientName: null },
  { id: 'pl5', projectId: 'p1', number: 'RGG-005', size: '100×100 ft', acres: 0.23, price: 3_500_000, status: 'sold', titleVerified: true, verifiedBy: 'Peter Ndung\'u', verifiedDate: '2024-12-10', clientName: 'Grace Waweru' },
  { id: 'pl6', projectId: 'p2', number: 'KRE-001', size: '50×100 ft', acres: 0.115, price: 2_200_000, status: 'sold', titleVerified: false, verifiedBy: null, verifiedDate: null, clientName: 'Samuel Mwangi' },
  { id: 'pl7', projectId: 'p2', number: 'KRE-002', size: '50×100 ft', acres: 0.115, price: 2_200_000, status: 'available', titleVerified: null, verifiedBy: null, verifiedDate: null, clientName: null },
  { id: 'pl8', projectId: 'p3', number: 'GPM-001', size: '50×100 ft', acres: 0.115, price: 1_650_000, status: 'booked', titleVerified: false, verifiedBy: null, verifiedDate: null, clientName: 'Ann Wangari' },
  { id: 'pl9', projectId: 'p4', number: 'TRP-001', size: '50×100 ft', acres: 0.115, price: 2_050_000, status: 'sold', titleVerified: true, verifiedBy: 'Wanjiku Kamau', verifiedDate: '2025-01-15', clientName: 'John Kamau' },
  { id: 'pl10', projectId: 'p4', number: 'TRP-002', size: '50×100 ft', acres: 0.115, price: 2_050_000, status: 'available', titleVerified: null, verifiedBy: null, verifiedDate: null, clientName: null },
];

export const contacts = [
  { id: 'c1', name: 'David Otieno', phone: '+254 712 345 678', email: 'david.otieno@gmail.com', location: 'Nairobi', source: 'Referral', plots: 1, totalValue: 1_850_000, type: 'buyer', diaspora: false },
  { id: 'c2', name: 'Grace Waweru', phone: '+254 722 198 432', email: 'gwaweru@outlook.com', location: 'London, UK', source: 'Instagram', plots: 2, totalValue: 5_350_000, type: 'buyer', diaspora: true },
  { id: 'c3', name: 'Samuel Mwangi', phone: '+254 733 876 543', email: 'samuelm@yahoo.com', location: 'Mombasa', source: 'Radio', plots: 1, totalValue: 2_200_000, type: 'buyer', diaspora: false },
  { id: 'c4', name: 'Ann Wangari', phone: '+254 700 123 987', email: 'ann.wangari@gmail.com', location: 'Dubai, UAE', source: 'CEO Referral', plots: 0, totalValue: 1_650_000, type: 'prospect', diaspora: true },
  { id: 'c5', name: 'Mary Njoroge', phone: '+254 711 654 321', email: 'mnjoroge@gmail.com', location: 'Nairobi', source: 'Website', plots: 1, totalValue: 1_850_000, type: 'buyer', diaspora: false },
  { id: 'c6', name: 'James Kariuki', phone: '+254 728 432 109', email: 'jkariuki@hotmail.com', location: 'USA', source: 'Instagram', plots: 0, totalValue: 1_950_000, type: 'prospect', diaspora: true },
  { id: 'c7', name: 'John Kamau', phone: '+254 745 987 654', email: 'johnkamau@gmail.com', location: 'Nairobi', source: 'Friend Referral', plots: 1, totalValue: 2_050_000, type: 'buyer', diaspora: false },
  { id: 'c8', name: 'Faith Chebet', phone: '+254 799 234 567', email: 'fchebet@gmail.com', location: 'Eldoret', source: 'Website', plots: 0, totalValue: 0, type: 'prospect', diaspora: false },
];

export const leads = [
  { id: 'l1', name: 'Patrick Ochieng', stage: 'new', project: 'Ruiru Green Gardens', plot: 'RGG-012', source: 'Instagram', date: '2025-07-28', agent: 'Amina Hassan', phone: '+254 712 000 111', siteVisit: false, diaspora: false },
  { id: 'l2', name: 'Lydia Njeri', stage: 'qualifying', project: 'Kiambu Ridge Estate', plot: 'KRE-015', source: 'CEO Referral', date: '2025-07-25', agent: 'Brian Mutua', phone: '+254 722 333 444', siteVisit: false, diaspora: false },
  { id: 'l3', name: 'Kevin Oduya', stage: 'qualifying', project: 'Tatu Ridge Plots', plot: 'TRP-009', source: 'Referral', date: '2025-07-22', agent: 'Amina Hassan', phone: '+1 617 555 0192', siteVisit: true, diaspora: true },
  { id: 'l4', name: 'Christine Wambua', stage: 'won', project: 'Ruiru Green Gardens', plot: 'RGG-031', source: 'Radio', date: '2025-07-10', agent: 'Faith Kosgei', phone: '+254 733 777 888', siteVisit: true, diaspora: false },
  { id: 'l5', name: 'Thomas Githinji', stage: 'new', project: 'Gatepath Meadows', plot: 'GPM-008', source: 'Website', date: '2025-07-29', agent: 'Brian Mutua', phone: '+254 700 444 555', siteVisit: false, diaspora: false },
  { id: 'l6', name: 'Esther Achieng', stage: 'lost', project: 'Kiambu Ridge Estate', plot: 'KRE-003', source: 'Website', date: '2025-07-01', agent: 'Faith Kosgei', phone: '+254 711 222 333', siteVisit: false, diaspora: false },
  { id: 'l7', name: 'Robert Ndegwa', stage: 'qualifying', project: 'Ruiru Green Gardens', plot: 'RGG-044', source: 'Friend Referral', date: '2025-07-20', agent: 'Amina Hassan', phone: '+971 50 123 4567', siteVisit: true, diaspora: true },
  { id: 'l8', name: 'Hellen Mugo', stage: 'new', project: 'Tatu Ridge Plots', plot: 'TRP-021', source: 'Instagram', date: '2025-07-30', agent: 'Brian Mutua', phone: '+254 728 666 777', siteVisit: false, diaspora: false },
];

export const agents = [
  { id: 'a1', name: 'Amina Hassan', avatar: 'AH', leadsAssigned: 18, contacted: 16, siteVisits: 9, depositsReceived: 6, closed: 4, conversionRate: 22, revenue: 8_350_000 },
  { id: 'a2', name: 'Brian Mutua', avatar: 'BM', leadsAssigned: 22, contacted: 14, siteVisits: 7, depositsReceived: 4, closed: 2, conversionRate: 9, revenue: 4_100_000 },
  { id: 'a3', name: 'Faith Kosgei', avatar: 'FK', leadsAssigned: 15, contacted: 15, siteVisits: 11, depositsReceived: 8, closed: 7, conversionRate: 47, revenue: 13_650_000 },
  { id: 'a4', name: 'Dennis Omondi', avatar: 'DO', leadsAssigned: 12, contacted: 6, siteVisits: 2, depositsReceived: 1, closed: 1, conversionRate: 8, revenue: 1_950_000 },
];

export const installments = [
  { id: 'i1', client: 'Grace Waweru', plot: 'TRP-045', project: 'Tatu Ridge Plots', totalPrice: 2_050_000, paid: 1_640_000, remaining: 410_000, nextDue: '2025-08-10', status: 'current', overdueDays: 0 },
  { id: 'i2', client: 'Mary Njoroge', plot: 'RGG-002', project: 'Ruiru Green Gardens', totalPrice: 1_850_000, paid: 740_000, remaining: 1_110_000, nextDue: '2025-07-25', status: 'overdue', overdueDays: 6 },
  { id: 'i3', client: 'James Kariuki', plot: 'RGG-003', project: 'Ruiru Green Gardens', totalPrice: 1_950_000, paid: 975_000, remaining: 975_000, nextDue: '2025-08-01', status: 'current', overdueDays: 0 },
  { id: 'i4', client: 'Samuel Mwangi', plot: 'KRE-001', project: 'Kiambu Ridge Estate', totalPrice: 2_200_000, paid: 880_000, remaining: 1_320_000, nextDue: '2025-07-18', status: 'overdue', overdueDays: 13 },
  { id: 'i5', client: 'Ann Wangari', plot: 'GPM-001', project: 'Gatepath Meadows', totalPrice: 1_650_000, paid: 412_500, remaining: 1_237_500, nextDue: '2025-08-05', status: 'current', overdueDays: 0 },
  { id: 'i6', client: 'Patrick Ochieng', plot: 'RGG-055', project: 'Ruiru Green Gardens', totalPrice: 1_850_000, paid: 185_000, remaining: 1_665_000, nextDue: '2025-07-20', status: 'overdue', overdueDays: 11 },
];

export const inquiries = [
  {
    id: 'inq1', name: 'Kevin Oduya', phone: '+1 617 555 0192', email: 'koduya@gmail.com',
    idNumber: '34521098', dob: '1985-03-12', occupation: 'Software Engineer',
    location: 'Boston, USA', diaspora: true,
    nextOfKin: 'Jane Oduya', nokPhone: '+254 722 112 233', nokRelation: 'Spouse',
    project: 'Tatu Ridge Plots', plot: 'TRP-009', price: 2_050_000,
    depositPaid: true, depositAmount: 205_000, fullyPaid: false,
    status: 'approved',
    offerLetterSigned: true, agreementSigned: false,
    submittedDate: '2025-07-22'
  },
  {
    id: 'inq2', name: 'Ann Wangari', phone: '+971 55 234 5678', email: 'ann.wangari@gmail.com',
    idNumber: '27891234', dob: '1979-11-20', occupation: 'Nurse',
    location: 'Dubai, UAE', diaspora: true,
    nextOfKin: 'Peter Wangari', nokPhone: '+254 733 445 566', nokRelation: 'Brother',
    project: 'Gatepath Meadows', plot: 'GPM-001', price: 1_650_000,
    depositPaid: true, depositAmount: 165_000, fullyPaid: false,
    status: 'approved',
    offerLetterSigned: true, agreementSigned: false,
    submittedDate: '2025-07-20'
  },
  {
    id: 'inq3', name: 'Lydia Njeri', phone: '+254 722 333 444', email: 'lydianjeri@gmail.com',
    idNumber: '31245678', dob: '1991-06-07', occupation: 'Teacher',
    location: 'Nairobi', diaspora: false,
    nextOfKin: 'Paul Njeri', nokPhone: '+254 711 987 654', nokRelation: 'Husband',
    project: 'Kiambu Ridge Estate', plot: 'KRE-015', price: 2_200_000,
    depositPaid: false, depositAmount: 0, fullyPaid: false,
    status: 'pending',
    offerLetterSigned: false, agreementSigned: false,
    submittedDate: '2025-07-25'
  },
  {
    id: 'inq4', name: 'John Kamau', phone: '+254 745 987 654', email: 'johnkamau@gmail.com',
    idNumber: '22345678', dob: '1975-02-14', occupation: 'Businessman',
    location: 'Nairobi', diaspora: false,
    nextOfKin: 'Alice Kamau', nokPhone: '+254 700 876 543', nokRelation: 'Wife',
    project: 'Tatu Ridge Plots', plot: 'TRP-001', price: 2_050_000,
    depositPaid: true, depositAmount: 2_050_000, fullyPaid: true,
    status: 'approved',
    offerLetterSigned: true, agreementSigned: true,
    submittedDate: '2025-06-15'
  },
];

export const siteVisits = [
  { id: 'sv1', clientName: 'Kevin Oduya', project: 'Tatu Ridge Plots', date: '2025-07-31', time: '10:00 AM', agent: 'Amina Hassan', status: 'confirmed', type: 'virtual', phone: '+1 617 555 0192' },
  { id: 'sv2', clientName: 'Robert Ndegwa', project: 'Ruiru Green Gardens', date: '2025-07-31', time: '2:00 PM', agent: 'Amina Hassan', status: 'confirmed', type: 'physical', phone: '+971 50 123 4567' },
  { id: 'sv3', clientName: 'Lydia Njeri', project: 'Kiambu Ridge Estate', date: '2025-08-01', time: '11:00 AM', agent: 'Brian Mutua', status: 'pending', type: 'physical', phone: '+254 722 333 444' },
  { id: 'sv4', clientName: 'Thomas Githinji', project: 'Gatepath Meadows', date: '2025-07-29', time: '3:00 PM', agent: 'Brian Mutua', status: 'overdue', type: 'physical', phone: '+254 700 444 555' },
  { id: 'sv5', clientName: 'Faith Mburu', project: 'Ruiru Green Gardens', date: '2025-08-02', time: '9:00 AM', agent: 'Faith Kosgei', status: 'pending', type: 'physical', phone: '+254 733 222 111' },
];

export const deals = [
  { id: 'd1', client: 'David Otieno', plot: 'RGG-001', project: 'Ruiru Green Gardens', price: 1_850_000, signedDate: '2025-06-01', agent: 'Faith Kosgei' },
  { id: 'd2', client: 'Grace Waweru', plot: 'RGG-005', project: 'Ruiru Green Gardens', price: 3_500_000, signedDate: '2025-05-14', agent: 'Amina Hassan' },
  { id: 'd3', client: 'John Kamau', plot: 'TRP-001', project: 'Tatu Ridge Plots', price: 2_050_000, signedDate: '2025-07-10', agent: 'Faith Kosgei' },
  { id: 'd4', client: 'Christine Wambua', plot: 'RGG-031', project: 'Ruiru Green Gardens', price: 1_850_000, signedDate: '2025-07-18', agent: 'Faith Kosgei' },
];

export const staff = [
  { id: 's1', name: 'Joseph Mwangi', email: 'joseph@gatepathrealtors.co.ke', role: 'CEO', status: 'active', canSign: true, avatar: 'JM', joined: '2020-01-01' },
  { id: 's2', name: 'Wanjiku Kamau', email: 'wanjiku@gatepathrealtors.co.ke', role: 'Manager', status: 'active', canSign: false, avatar: 'WK', joined: '2021-03-15' },
  { id: 's3', name: 'Amina Hassan', email: 'amina@gatepathrealtors.co.ke', role: 'Agent', status: 'active', canSign: false, avatar: 'AH', joined: '2022-06-01' },
  { id: 's4', name: 'Brian Mutua', email: 'brian@gatepathrealtors.co.ke', role: 'Agent', status: 'active', canSign: false, avatar: 'BM', joined: '2022-09-10' },
  { id: 's5', name: 'Faith Kosgei', email: 'faith@gatepathrealtors.co.ke', role: 'Agent', status: 'active', canSign: false, avatar: 'FK', joined: '2023-01-20' },
  { id: 's6', name: 'Dennis Omondi', email: 'dennis@gatepathrealtors.co.ke', role: 'Agent', status: 'active', canSign: false, avatar: 'DO', joined: '2023-08-01' },
  { id: 's7', name: 'Peter Ndung\'u', email: 'peter@gatepathrealtors.co.ke', role: 'Manager', status: 'inactive', canSign: false, avatar: 'PN', joined: '2021-07-01' },
];

export const formatKES = (n: number) =>
  'KES ' + n.toLocaleString('en-KE', { minimumFractionDigits: 0 });
