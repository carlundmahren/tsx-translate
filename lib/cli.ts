import { Command } from "@commander-js/extra-typings"
import chalk from "chalk"
import fs from "fs-extra"
import path from "path"
import pckg from "../package.json"
import { TranslatableType, parse } from "./index"

const getTSXFiles = (directoryPath: string) => {
	const files = fs.readdirSync(directoryPath)
	let tsxFiles: string[] = []

	files.forEach((file: any) => {
		const filePath = path.join(directoryPath, file)
		const stats = fs.statSync(filePath)

		if (stats.isDirectory()) {
			tsxFiles = tsxFiles.concat(getTSXFiles(filePath))
		} else if (path.extname(file) === ".tsx") {
			tsxFiles.push(filePath)
		}
	})

	return tsxFiles
}

new Command()
	.version(pckg.version)
	.argument("<string>", "string to split")
	.usage("[options]")
	.action((str, _options) => {
		const tsxFiles = getTSXFiles(str)

		tsxFiles.forEach((file) => {
			const fileContent = fs.readFileSync(file, { encoding: "utf8" })
			const result = parse(fileContent)
			const untranslated = result.filter(
				(node) =>
					node.translatables.filter(
						(t) => t.type === TranslatableType.Untranslated,
					).length > 0,
			)

			if (untranslated.length > 0) {
				console.log(chalk.white.dim(file))

				untranslated.map((node) => {
					node.translatables.map((t) => {
						console.log(chalk.white(node.type + " " + t.key + ": " + t.value))
					})
				})

				console.log("")
			}
		})
	})
	.parse(process.argv)
