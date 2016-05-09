export default function Collection (component, sources, items = []) {
  return {
    add (moreSources) {
      const newItem = component({...sources, ...moreSources});

      return Collection(
        component,
        sources,
        [...items, newItem]
      )
    },

    asArray () {
      return items;
    }
  }
}
