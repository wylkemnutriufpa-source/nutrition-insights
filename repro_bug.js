
// Mocking the scenario where refetch overwrites pending state
async function simulateBug() {
  let storeItems = [{ id: 'A', title: 'Old' }, { id: 'B', title: 'Old' }];
  let pendingOps = [
    { key: 'update:A', persist: async () => { console.log('Saving A...'); /* simulates DB update */ } },
    { key: 'update:B', persist: async () => { console.log('Saving B...'); /* simulates DB update */ } }
  ];

  console.log('Initial Store:', storeItems);

  // User edits A
  storeItems[0].title = 'New A';
  console.log('User edited A:', storeItems);

  // User edits B
  storeItems[1].title = 'New B';
  console.log('User edited B:', storeItems);

  // Flush Queue starts
  const ops = [...pendingOps];
  for (const op of ops) {
    console.log('Running op:', op.key);
    await op.persist();
    
    // Simulating the bug: refetch after each operation
    console.log('Refetching from DB...');
    // DB has A='New A' now, but B is still 'Old' because op for B hasn't run yet
    const dbItems = [{ id: 'A', title: 'New A' }, { id: 'B', title: 'Old' }];
    
    console.log('Setting store items from refetch...');
    storeItems = dbItems;
    console.log('Store items after refetch:', storeItems);
    
    // Now next op runs
    if (op.key === 'update:A') {
      // The edit for B is now GONE from the store!
    }
  }

  console.log('Final Store State:', storeItems);
}

simulateBug();
