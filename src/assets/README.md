# Assets

Place any static assets in this directory.

By default, assets can be accessed by `${host}/assets/${path-to-asset}`.

To change the static path, change the `serveRoot` property of `ServeStaticModule`.

```typescript
@Module({
  ...
  imports: [
    ...
    ServeStaticModule.forRoot({
      rootPath: configs.paths.assets,
      serveRoot: '/assets', // Change it to change the root path of assets.
    }),
    ...
  ],
  ...
})
export class AppModule {}
```
