import json

with open('workflows/1-entry-pesan-konfirmasi.json', encoding='utf-8') as f:
    wf = json.load(f)

node_names = set(n['name'] for n in wf['nodes'])
print("Total nodes in 1-entry:", len(node_names))

connections = wf.get('connections', {})
for source_node, conn_types in connections.items():
    if source_node not in node_names:
        print(f"ERROR: source node '{source_node}' NOT in nodes!")
    for conn_type, outputs in conn_types.items():
        for out_idx, target_list in enumerate(outputs):
            for t in target_list:
                target_node = t.get('node')
                if not target_node:
                    print(f"ERROR: missing 'node' in connection from {source_node} [{conn_type}][{out_idx}]: {t}")
                elif target_node not in node_names:
                    print(f"ERROR: target node '{target_node}' NOT in nodes (connected from {source_node})!")
print("1-entry Connection check complete.")
