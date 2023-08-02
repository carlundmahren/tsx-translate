import * as babelParse from "@babel/parser"
import { isJSXIdentifier, isJSXMemberExpression, traverse } from "@babel/types"

const getParentType = (node: any): any => {
	if (isJSXIdentifier(node)) {
		return node.name
	}
	if (isJSXMemberExpression(node)) {
		return getParentType(node.object) + "." + node.property.name
	}
}

export enum TranslatableType {
	Translated = "Translated",
	Untranslated = "Untranslated",
}

interface Translatable {
	type: TranslatableType
	key: string
	value: string
}

export interface ReactNode {
	type: string
	translatables: Translatable[]
}

export const parse = (code: string) => {
	const ast = babelParse.parse(code, {
		plugins: ["jsx", "typescript"],
		allowImportExportEverywhere: true,
		sourceType: "module",
	})
	let tree: ReactNode[] = []
	let canAddValue = true

	const addNode = (node: Translatable) => {
		if (canAddValue && tree.length > 0) {
			tree[tree.length - 1].translatables.push(node)
		}
	}

	traverse(ast, {
		enter(node, parent, state) {
			if (node.type === "JSXOpeningElement") {
				const { name } = node

				let _node: ReactNode | null = null
				if (isJSXIdentifier(name)) {
					_node = {
						type: name.name,
						translatables: [],
					}
				} else if (isJSXMemberExpression(name)) {
					_node = {
						// @ts-ignore
						type: name.object.name + "." + name.property.name,
						translatables: [],
					}
				}

				canAddValue = false
				if (_node) {
					if (
						!_node.type.includes("svg") &&
						!_node.type.includes("motion.svg")
					) {
						const parentTypes = parent
							.filter((p) => p.index === 1)
							.reverse()
							.filter(
								(p) =>
									// @ts-ignore
									p.node.openingElement &&
									// @ts-ignore
									p.node.openingElement.name &&
									// @ts-ignore
									p.node.openingElement.name.name,
							)
							// @ts-ignore
							.map((p) => p.node.openingElement.name.name)

						if (
							!parentTypes.includes("svg") &&
							!parentTypes.includes("motion.svg")
						) {
							canAddValue = true
							tree.push(_node)
						}
					}
				}
			} else if (node.type === "JSXAttribute") {
				if (
					node.value &&
					node.value.type === "JSXExpressionContainer" &&
					node.value.expression.type === "CallExpression" &&
					node.value.expression.callee.type === "Identifier" &&
					node.value.expression.callee.name === "t"
				) {
					// for prop with translated value
					tree[tree.length - 1].translatables.push({
						type: TranslatableType.Translated,
						key: node.name.name as string,
						// @ts-ignore
						value: node.value.expression.arguments[0].value,
					})
				} else {
					// for normal prop
					if (node.value && node.value.type === "StringLiteral") {
						addNode({
							type: TranslatableType.Untranslated,
							key: node.name.name as string,
							value: node.value.value,
						})
					}
				}
			} else if (node.type === "JSXText") {
				const text = node.value.replace(/[\n]/g, "").trim()

				if (text.length > 0) {
					addNode({
						type: TranslatableType.Untranslated,
						key: "child",
						value: text,
					})
				}
			} else if (node.type === "Identifier") {
				if (node.name === "t") {
					const charactersBefore = code
						.substring(node.start! - 2, node.end!)
						.replace(/\s/g, "")

					if (charactersBefore !== "={t") {
						addNode({
							type: TranslatableType.Translated,
							key: "child",
							value: "",
						})
					}
				}
			} else if (
				node.type === "StringLiteral" &&
				tree.length > 0 &&
				tree[tree.length - 1].translatables[
					tree[tree.length - 1].translatables.length - 1
				] &&
				tree[tree.length - 1].translatables[
					tree[tree.length - 1].translatables.length - 1
				].type === TranslatableType.Translated
			) {
				if (node.value.replace(/\s/g, "").length > 0) {
					tree[tree.length - 1].translatables[
						tree[tree.length - 1].translatables.length - 1
					].value = node.value
				}
			} else {
				// console.log(node.type);
			}
		},
		exit(_path) {},
	})

	// filtering common classes away
	const filterKeys = [
		"className",
		"outerClassName",
		"style",
		"type",
		"href",
		"method",
		"innerClassName",
		"layoutId",
		"mode",
		"src",
		"alt",
		"to",
		"name",
		"target",
		"Element",
		"encType",
		"backTo",
		"action",
		"id",
		"partnerId",
		"key",
		"rel",
		"pencilStyle",
		"fileName",
		"value",
	]

	const filterTypes = [
		"path",
		"motion.path",
		"motion.circle",
		"rect",
		"clipPath",
		"feColorMatrix",
		"feComposite",
		"feFlood",
		"filter",
		"feBlend",
		"linearGradient",
		"stop",
		"circle",
		"em-emoji",
		"html",
		"link",
		"meta",
	]

	return tree
		.map((item) => ({
			type: item.type,
			translatables: item.translatables.filter(
				(t) => !filterKeys.includes(t.key) && t.value.length > 1,
			),
		}))
		.filter(
			(item) =>
				item.translatables.length > 0 &&
				!item.type.match(/.*Icon/) &&
				!filterTypes.includes(item.type),
		)
}
