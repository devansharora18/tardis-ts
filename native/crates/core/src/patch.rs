// Patch decoding and application.
//
// A patch is applied to a clone first. If any op is invalid the original scene
// is untouched and the core reports the failure, matching protocol invariant 4.

use serde::Deserialize;
use serde_json::Value;

use crate::scene::{Node, NodeKind, Scene};

#[derive(Debug, Deserialize)]
pub struct Patch {
    pub v: u8,
    pub frame: u64,
    pub ops: Vec<Op>,
}

#[derive(Debug, Deserialize)]
#[serde(tag = "op", rename_all = "snake_case")]
pub enum Op {
    Create {
        id: u32,
        kind: String,
        parent: u32,
        index: u32,
    },
    Destroy {
        id: u32,
    },
    Insert {
        id: u32,
        parent: u32,
        index: u32,
    },
    Style {
        id: u32,
        props: serde_json::Map<String, Value>,
    },
    Text {
        id: u32,
        value: String,
    },
    Image {
        id: u32,
        src: String,
        #[serde(default)]
        fit: Option<String>,
    },
    Scroll {
        id: u32,
        x: f32,
        y: f32,
    },
}

pub fn apply_patch(scene: &mut Scene, patch: Patch) -> Result<(), String> {
    if patch.v != 0 {
        return Err(format!("unsupported patch version {}", patch.v));
    }
    let mut next = scene.clone();
    for op in patch.ops {
        apply_op(&mut next, op)?;
    }
    *scene = next;
    Ok(())
}

fn apply_op(scene: &mut Scene, op: Op) -> Result<(), String> {
    match op {
        Op::Create {
            id,
            kind,
            parent,
            index,
        } => {
            if scene.nodes.contains_key(&id) {
                return Err(format!("create: id {id} already exists"));
            }
            if id == 0 {
                return Err("create: id 0 is reserved for the root".to_string());
            }
            let node_kind =
                NodeKind::parse(&kind).ok_or_else(|| format!("create: unknown kind {kind}"))?;
            let parent_node = scene
                .nodes
                .get(&parent)
                .ok_or_else(|| format!("create: parent {parent} does not exist"))?;
            let at = (index as usize).min(parent_node.children.len());
            scene
                .nodes
                .get_mut(&parent)
                .expect("parent checked above")
                .children
                .insert(at, id);
            let mut node = Node::new(id, node_kind);
            node.parent = Some(parent);
            scene.nodes.insert(id, node);
        }
        Op::Destroy { id } => {
            if id == 0 {
                return Err("destroy: the root cannot be destroyed".to_string());
            }
            if !scene.nodes.contains_key(&id) {
                return Err(format!("destroy: id {id} does not exist"));
            }
            let parent = scene.nodes.get(&id).and_then(|node| node.parent);
            if let Some(parent_id) = parent {
                if let Some(parent_node) = scene.nodes.get_mut(&parent_id) {
                    parent_node.children.retain(|child| *child != id);
                }
            }
            let mut removed = scene.descendants(id);
            removed.push(id);
            for node_id in removed {
                scene.nodes.remove(&node_id);
            }
        }
        Op::Insert { id, parent, index } => {
            if id == 0 {
                return Err("insert: the root cannot be moved".to_string());
            }
            if !scene.nodes.contains_key(&id) {
                return Err(format!("insert: id {id} does not exist"));
            }
            if !scene.nodes.contains_key(&parent) {
                return Err(format!("insert: parent {parent} does not exist"));
            }
            if scene.descendants(id).contains(&parent) {
                return Err("insert: cannot move a node into its own subtree".to_string());
            }
            let old_parent = scene.nodes.get(&id).and_then(|node| node.parent);
            if let Some(old) = old_parent {
                if let Some(node) = scene.nodes.get_mut(&old) {
                    node.children.retain(|child| *child != id);
                }
            }
            let at = {
                let parent_node = scene.nodes.get(&parent).expect("parent checked above");
                (index as usize).min(parent_node.children.len())
            };
            scene
                .nodes
                .get_mut(&parent)
                .expect("parent checked above")
                .children
                .insert(at, id);
            if let Some(node) = scene.nodes.get_mut(&id) {
                node.parent = Some(parent);
            }
        }
        Op::Style { id, props } => {
            let node = scene
                .nodes
                .get_mut(&id)
                .ok_or_else(|| format!("style: id {id} does not exist"))?;
            let mut style = node.style.clone();
            for (key, value) in props {
                style.set(&key, &value)?;
            }
            node.style = style;
        }
        Op::Text { id, value } => {
            let node = scene
                .nodes
                .get_mut(&id)
                .ok_or_else(|| format!("text: id {id} does not exist"))?;
            node.text = value;
        }
        Op::Image { id, src, .. } => {
            let node = scene
                .nodes
                .get_mut(&id)
                .ok_or_else(|| format!("image: id {id} does not exist"))?;
            node.src = Some(src);
        }
        Op::Scroll { id, x, y } => {
            let node = scene
                .nodes
                .get_mut(&id)
                .ok_or_else(|| format!("scroll: id {id} does not exist"))?;
            node.scroll = (x, y);
        }
    }
    Ok(())
}
