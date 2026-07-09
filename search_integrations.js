(async () => {
  try {
    const results = await searchIntegrations("Google");
    console.log("SEARCH GOOGLE:", JSON.stringify(results, null, 2));
    const results2 = await searchIntegrations("OAuth");
    console.log("SEARCH OAUTH:", JSON.stringify(results2, null, 2));
  } catch (e) {
    console.error("ERROR:", e.message);
  }
})();
