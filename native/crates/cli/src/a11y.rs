// AccessKit tree derived from the scene.
//
// Scene nodes are mapped to accessibility roles by tag/ARIA role. Text content
// becomes names/values; layout rects become bounds in physical pixels. Nodes
// hidden from layout are excluded together with their subtree.

use accesskit::{
    Action, DefaultActionVerb, Node as AccessNode, NodeBuilder, NodeClassSet, NodeId, Rect, Role,
    Tree, TreeUpdate,
};
use tardis_core::layout::ComputedLayout;
use tardis_core::scene::{FlexDirection, Node, NodeKind, Scene};

const WINDOW_ID: NodeId = NodeId(0);

fn node_id(scene_id: u32) -> NodeId {
    NodeId(scene_id as u64 + 1)
}

fn scene_id(id: NodeId) -> Option<u32> {
    id.0.checked_sub(1).map(|value| value as u32)
}

fn a11y_str<'a>(node: &'a Node, key: &str) -> Option<&'a str> {
    node.a11y.get(key).and_then(|value| value.as_str())
}

fn a11y_bool(node: &Node, key: &str) -> Option<bool> {
    match node.a11y.get(key) {
        Some(serde_json::Value::Bool(value)) => Some(*value),
        Some(serde_json::Value::String(value)) => match value.as_str() {
            "true" => Some(true),
            "false" => Some(false),
            _ => None,
        },
        _ => None,
    }
}

fn visible(scene: &Scene, id: u32) -> bool {
    let mut current = scene.nodes.get(&id);
    while let Some(node) = current {
        if !node.style.display {
            return false;
        }
        current = node.parent.and_then(|parent| scene.nodes.get(&parent));
    }
    true
}

fn is_textbox(node: &Node) -> bool {
    a11y_str(node, "role") == Some("textbox")
        || (node.tag == "input" && a11y_str(node, "type") != Some("checkbox"))
}

fn control_ancestor(scene: &Scene, id: u32) -> bool {
    let mut current = scene.nodes.get(&id).and_then(|node| node.parent);
    while let Some(parent_id) = current {
        let Some(node) = scene.nodes.get(&parent_id) else {
            break;
        };
        let role = a11y_str(node, "role").unwrap_or("");
        if matches!(role, "button" | "checkbox" | "link" | "textbox")
            || matches!(node.tag.as_str(), "button" | "a" | "label")
            || matches!(node.tag.as_str(), "h1" | "h2" | "h3" | "h4" | "h5" | "h6")
        {
            return true;
        }
        current = node.parent;
    }
    false
}

fn included(scene: &Scene, id: u32) -> bool {
    if id == scene.root || !visible(scene, id) {
        return false;
    }
    let Some(node) = scene.nodes.get(&id) else {
        return false;
    };
    if node.kind == NodeKind::Text && control_ancestor(scene, id) {
        return false;
    }
    true
}

fn collect_text(scene: &Scene, id: u32, out: &mut String) {
    let Some(node) = scene.nodes.get(&id) else {
        return;
    };
    if !node.style.display {
        return;
    }
    if node.kind == NodeKind::Text {
        out.push_str(&node.text);
        return;
    }
    let column = matches!(
        node.style.flex_direction,
        FlexDirection::Column | FlexDirection::ColumnReverse
    );
    for (index, child) in node.children.iter().enumerate() {
        if column && index > 0 && !out.ends_with('\n') {
            out.push('\n');
        }
        collect_text(scene, *child, out);
    }
}

fn text_content(scene: &Scene, id: u32) -> String {
    let mut text = String::new();
    collect_text(scene, id, &mut text);
    text.trim().to_string()
}

fn role_for(node: &Node) -> (Role, Option<usize>) {
    if let Some(role) = a11y_str(node, "role") {
        return match role {
            "button" => (Role::Button, None),
            "checkbox" => (Role::CheckBox, None),
            "textbox" => {
                if a11y_bool(node, "aria-multiline").unwrap_or(false) {
                    (Role::MultilineTextInput, None)
                } else {
                    (Role::TextInput, None)
                }
            }
            "link" => (Role::Link, None),
            "heading" => (
                Role::Heading,
                a11y_str(node, "aria-level").and_then(|value| value.parse().ok()),
            ),
            "list" => (Role::List, None),
            "listitem" => (Role::ListItem, None),
            "navigation" => (Role::Navigation, None),
            "img" => (Role::Image, None),
            "alert" => (Role::Alert, None),
            "dialog" => (Role::Dialog, None),
            _ => (Role::GenericContainer, None),
        };
    }
    match node.tag.as_str() {
        "button" => (Role::Button, None),
        "a" => (Role::Link, None),
        "h1" => (Role::Heading, Some(1)),
        "h2" => (Role::Heading, Some(2)),
        "h3" => (Role::Heading, Some(3)),
        "h4" => (Role::Heading, Some(4)),
        "h5" => (Role::Heading, Some(5)),
        "h6" => (Role::Heading, Some(6)),
        "p" => (Role::Paragraph, None),
        "ul" => (Role::List, None),
        "li" => (Role::ListItem, None),
        "nav" => (Role::Navigation, None),
        "img" => (Role::Image, None),
        _ => match node.kind {
            NodeKind::Text => (Role::StaticText, None),
            NodeKind::Image => (Role::Image, None),
            _ => (Role::GenericContainer, None),
        },
    }
}

fn bounds(layout: Option<&ComputedLayout>, id: u32, scale: f32) -> Option<Rect> {
    let rect = layout?.rects.get(&id)?;
    Some(Rect {
        x0: (rect.x * scale) as f64,
        y0: (rect.y * scale) as f64,
        x1: ((rect.x + rect.width) * scale) as f64,
        y1: ((rect.y + rect.height) * scale) as f64,
    })
}

fn build_node(
    scene: &Scene,
    node: &Node,
    rect: Option<Rect>,
    classes: &mut NodeClassSet,
) -> AccessNode {
    let (role, level) = role_for(node);
    let mut builder = NodeBuilder::new(role);
    if let Some(level) = level {
        builder.set_hierarchical_level(level);
    }
    if let Some(rect) = rect {
        builder.set_bounds(rect);
    }
    if let Some(name) = a11y_str(node, "aria-label") {
        builder.set_name(name);
    } else if node.kind == NodeKind::Text {
        builder.set_name(node.text.clone());
    } else if node.kind == NodeKind::Image {
        if let Some(alt) = a11y_str(node, "alt") {
            builder.set_name(alt);
        }
    } else if matches!(
        role,
        Role::Button | Role::CheckBox | Role::Link | Role::Heading
    ) {
        let name = text_content(scene, node.id);
        if !name.is_empty() {
            builder.set_name(name);
        }
    }
    if is_textbox(node) {
        let value = a11y_str(node, "aria-valuetext")
            .map(str::to_string)
            .unwrap_or_else(|| text_content(scene, node.id));
        builder.set_value(value);
    }
    if role == Role::CheckBox {
        let checked = a11y_bool(node, "aria-checked").unwrap_or(false);
        builder.set_value(if checked { "checked" } else { "unchecked" });
    }
    if a11y_bool(node, "aria-disabled").unwrap_or(false) {
        builder.set_disabled();
    }
    let focusable = matches!(
        role,
        Role::Button
            | Role::CheckBox
            | Role::TextInput
            | Role::MultilineTextInput
            | Role::Link
            | Role::SearchInput
    );
    if focusable {
        builder.add_action(Action::Focus);
    }
    match role {
        Role::Button | Role::Link => {
            builder.add_action(Action::Default);
            builder.set_default_action_verb(DefaultActionVerb::Click);
        }
        Role::CheckBox => {
            builder.add_action(Action::Default);
            builder.set_default_action_verb(DefaultActionVerb::Click);
        }
        Role::TextInput | Role::MultilineTextInput => {
            builder.add_action(Action::SetValue);
            builder.add_action(Action::ReplaceSelectedText);
        }
        _ => {}
    }
    builder.set_children(
        node.children
            .iter()
            .filter(|child| included(scene, **child))
            .map(|child| node_id(*child))
            .collect::<Vec<NodeId>>(),
    );
    builder.build(classes)
}

/// Build a full AccessKit update for the current scene and layout.
pub fn tree_update(
    scene: &Scene,
    layout: Option<&ComputedLayout>,
    scale: f32,
    width: f32,
    height: f32,
    classes: &mut NodeClassSet,
) -> TreeUpdate {
    let mut nodes: Vec<(NodeId, AccessNode)> = Vec::new();
    let mut root_builder = NodeBuilder::new(Role::Window);
    root_builder.set_name("Tardis");
    root_builder.set_bounds(Rect {
        x0: 0.0,
        y0: 0.0,
        x1: (width * scale) as f64,
        y1: (height * scale) as f64,
    });
    let root = scene.nodes.get(&scene.root);
    let children: Vec<NodeId> = root
        .map(|node| {
            node.children
                .iter()
                .filter(|child| included(scene, **child))
                .map(|child| node_id(*child))
                .collect()
        })
        .unwrap_or_default();
    root_builder.set_children(children);
    nodes.push((WINDOW_ID, root_builder.build(classes)));

    let mut ids: Vec<u32> = scene.nodes.keys().copied().collect();
    ids.sort_unstable();
    for id in ids {
        if !included(scene, id) {
            continue;
        }
        let node = scene.nodes.get(&id).expect("id came from the scene");
        let built = build_node(scene, node, bounds(layout, id, scale), classes);
        nodes.push((node_id(id), built));
    }

    let mut focus = scene.focused.unwrap_or(scene.root);
    if !included(scene, focus) {
        let mut current = scene.nodes.get(&focus).and_then(|node| node.parent);
        focus = scene.root;
        while let Some(parent) = current {
            if included(scene, parent) {
                focus = parent;
                break;
            }
            current = scene.nodes.get(&parent).and_then(|node| node.parent);
        }
    }
    let focus = if included(scene, focus) {
        node_id(focus)
    } else {
        WINDOW_ID
    };

    TreeUpdate {
        nodes,
        tree: Some(Tree {
            root: WINDOW_ID,
            app_name: Some("Tardis".to_string()),
            toolkit_name: Some("TardisJS".to_string()),
            toolkit_version: Some(env!("CARGO_PKG_VERSION").to_string()),
        }),
        focus,
    }
}

/// Convert an AccessKit target id back to a scene id.
pub fn target_scene_id(id: NodeId) -> Option<u32> {
    scene_id(id)
}

#[cfg(test)]
mod tests {
    use super::*;
    use accesskit::Action;
    use tardis_core::Engine;

    fn engine_with(ops: &str) -> Engine {
        let mut engine = Engine::new(300.0, 200.0);
        let patch = format!(r##"{{"v":0,"frame":1,"ops":{ops}}}"##);
        engine.apply_json(&patch).expect("patch applies");
        engine
    }

    fn find(update: &TreeUpdate, id: NodeId) -> &AccessNode {
        update
            .nodes
            .iter()
            .find(|(candidate, _)| *candidate == id)
            .map(|(_, node)| node)
            .expect("node is in the tree")
    }

    #[test]
    fn maps_roles_names_values_and_focus() {
        let engine = engine_with(
            r##"[
              {"op":"create","id":1,"kind":"view","tag":"div","parent":0,"index":0},
              {"op":"create","id":2,"kind":"view","tag":"button","parent":1,"index":0},
              {"op":"a11y","id":2,"props":{"aria-label":"Save"}},
              {"op":"create","id":3,"kind":"view","tag":"div","parent":1,"index":1},
              {"op":"a11y","id":3,"props":{"role":"textbox","aria-label":"Name","aria-valuetext":"Ada","tabIndex":0}},
              {"op":"create","id":4,"kind":"text","tag":"span","parent":3,"index":0},
              {"op":"text","id":4,"value":"Ada"},
              {"op":"focus","id":3}
            ]"##,
        );
        let mut classes = NodeClassSet::new();
        let update = tree_update(
            &engine.scene,
            engine.layout.as_ref(),
            engine.scale,
            engine.width,
            engine.height,
            &mut classes,
        );

        let root = find(&update, WINDOW_ID);
        assert_eq!(root.role(), Role::Window);
        assert_eq!(root.children(), &[node_id(1)]);

        let button = find(&update, node_id(2));
        assert_eq!(button.role(), Role::Button);
        assert_eq!(button.name(), Some("Save"));
        assert!(button.supports_action(Action::Default));

        let textbox = find(&update, node_id(3));
        assert_eq!(textbox.role(), Role::TextInput);
        assert_eq!(textbox.name(), Some("Name"));
        assert_eq!(textbox.value(), Some("Ada"));
        assert!(textbox.supports_action(Action::SetValue));

        assert_eq!(update.focus, node_id(3));
    }

    #[test]
    fn maps_multiline_text_and_disabled_state() {
        let engine = engine_with(
            r##"[
              {"op":"create","id":1,"kind":"view","tag":"div","parent":0,"index":0},
              {"op":"a11y","id":1,"props":{"role":"textbox","aria-multiline":"true","aria-disabled":"true"}}
            ]"##,
        );
        let mut classes = NodeClassSet::new();
        let update = tree_update(
            &engine.scene,
            engine.layout.as_ref(),
            engine.scale,
            engine.width,
            engine.height,
            &mut classes,
        );
        let field = find(&update, node_id(1));
        assert_eq!(field.role(), Role::MultilineTextInput);
        assert!(field.is_disabled());
    }

    #[test]
    fn hides_text_inside_controls_and_maps_heading_levels() {
        let engine = engine_with(
            r##"[
              {"op":"create","id":1,"kind":"view","tag":"h2","parent":0,"index":0},
              {"op":"create","id":2,"kind":"text","tag":"span","parent":1,"index":0},
              {"op":"text","id":2,"value":"Title"}
            ]"##,
        );
        let mut classes = NodeClassSet::new();
        let update = tree_update(
            &engine.scene,
            engine.layout.as_ref(),
            engine.scale,
            engine.width,
            engine.height,
            &mut classes,
        );
        let heading = find(&update, node_id(1));
        assert_eq!(heading.role(), Role::Heading);
        assert_eq!(heading.name(), Some("Title"));
        assert_eq!(heading.hierarchical_level(), Some(2));
        assert!(!update.nodes.iter().any(|(id, _)| *id == node_id(2)));
    }
}
