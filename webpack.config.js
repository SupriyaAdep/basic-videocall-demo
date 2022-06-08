var webpack = require("webpack");
var path = require("path");
var MiniCssExtractPlugin = require("mini-css-extract-plugin");
var HtmlWebpackPlugin = require("html-webpack-plugin");

module.exports = {
  mode: "development",
  entry: {
    index: "./src/index.js",
  },
  plugins: [
    new HtmlWebpackPlugin({
      title: "My App",
      template: "./src/index.html",
      cache: false,
    }),
    new webpack.ProvidePlugin({
      $: "jquery",
      jQuery: "jquery",
    }),
    new MiniCssExtractPlugin(),
  ],
  module: {
    rules: [
      {
        // Uses regex to test for a file type - in this case, ends with `.css`
        test: /\.css$/,
        // Apply these loaders if test returns true
        use: ["style-loader", "css-loader"],
      },
      // {
      //   test: /\.css$/i,
      //   use: [MiniCssExtractPlugin.loader, "css-loader"],
      // },
      // {
      //   test: /\.css$/,
      //   use: [
      //     "style-loader",
      //     {
      //       loader: "css-loader",
      //       options: {
      //         importLoaders: 1,
      //         modules: true,
      //       },
      //     },
      //   ],
      //   include: /\.module\.css$/,
      // },
      // {
      //   test: /\.css$/,
      //   use: ["style-loader", "css-loader"],
      //   exclude: /\.module\.css$/,
      // },
    ],
  },
  output: {
    filename: "main.js",
    path: path.resolve(__dirname, "dist"),
    clean: true,
  },
  devtool: "inline-source-map",
  devServer: {
    static: "./dist",
    compress: true,
    port: 9000,
  },
};
