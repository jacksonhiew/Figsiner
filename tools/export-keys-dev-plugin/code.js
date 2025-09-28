async function exportComponentCatalog() {
  const components = figma.root.findAll((node) => node.type === 'COMPONENT');
  const catalog = components.map((component) => {
    const variantGroups = component.variantGroupProperties ?? {};
    const variants = Object.fromEntries(
      Object.entries(variantGroups).map(([groupName, options]) => [groupName, Object.keys(options)])
    );
    return {
      name: component.name,
      componentKey: component.key,
      variants: Object.keys(variants).length > 0 ? variants : undefined
    };
  });

  const sorted = catalog.sort((a, b) => a.name.localeCompare(b.name));
  const json = JSON.stringify(sorted, null, 2);

  await figma.clipboard.writeText(json);
  figma.notify(`Copied ${sorted.length} component keys to clipboard.`);
  figma.closePlugin();
}

exportComponentCatalog().catch((error) => {
  console.error('Failed to export component catalog', error);
  figma.notify('Failed to export component catalog');
  figma.closePlugin();
});
