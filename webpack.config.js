const path = require("path");

module.exports = {
    mode: "production",
    entry: [
        path.join(__dirname, "node_modules/@vizuaalog/bulmajs/src/plugins/", "navbar"),
    ],
    output: {
        filename: "bundle.js",
        path: path.resolve(__dirname, "assets/js"),
    },
    module: {
        rules: [
            {
                test: /.js$/,
                exclude: [
                    path.resolve(__dirname, "node_modules"),
                ],
                loader: "babel-loader",
            },
        ],
    },
    resolve: {
        extensions: [".json", ".js", ".jsx"],
    },
};