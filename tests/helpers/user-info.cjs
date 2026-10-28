function userInfo(overrides = {}) {
  return {
    sub: "user-123", username: "tester", name: "Test User", status: 1, isAktif: 1, level: 1,
    branch: "001", profile: "[CABANG]", groups: ["/CABANG/001"],
    Modul: [{
      modul_code: "RMT-RU", has_access: true, role: 99, profile: '["RMT-DSO","RMT-TREASURI","CABANG"]',
      menus: [
        ...["Home", "Limit", "Underlying", "Rate", "Riwayat Otorisasi"].map((menu, id) => ({ id, code: "RMT-RU", menu, role: 99 })),
        ...["Daftar Otorisasi Data", "Log Activity"].map((menu, id) => ({ id: id + 5, code: "RMT-RU", menu, role: 2 })),
      ],
    }],
    ...overrides,
  };
}
module.exports = { userInfo };
