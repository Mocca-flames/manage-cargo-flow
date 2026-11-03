// ONE place for "who can do what". UI hides things with these. The server still enforces.
const isDirector = (role?: string) => role === "director";
const isStaff = (role?: string) => role === "admin" || role === "director";

export const can = {
  usePortal: isStaff,
  reviewCompanies: isStaff,
  reviewDocuments: isStaff,
  handleInterests: isStaff,
  createPrivilegedStaff: isDirector,
  changeRoles: isDirector,
  activateUsers: isDirector,
  deleteUsers: isDirector,
  resetPasswords: isDirector,
};
