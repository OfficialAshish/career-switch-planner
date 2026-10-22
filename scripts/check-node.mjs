if (Number(process.versions.node.split('.')[0]) < 24) {
  console.error(
    'Node.js 24 or newer is required. Upgrade from https://nodejs.org and reopen the terminal.',
  );
  process.exit(1);
}
