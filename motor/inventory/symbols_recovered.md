# Registro de simbolos recuperados

- Simbolos con nombre real: **5612**
- Imports resueltos a nombre real: **12044** de 12778
- Imports sin resolver (modulo externo no extraido): **734**
- Renombrados aplicados en el arbol: **6015**
- Renombrados omitidos: **0**

## Metodo de recuperacion

1. `export{LOCAL as NAME}` — el simbolo local es NAME en el modulo original (confianza alta)
2. `export{NAME}` — el simbolo local es NAME (confianza alta)
3. definicion textual `const/let/var/function/class NAME` (confianza media)

**No se infieren nombres.** Sin evidencia, el simbolo conserva su forma minificada.

## Simbolos por nombre (top 250)

| Nombre | Chunks | Evidencia |
|---|---:|---|
| `model` | 93 | export{local as exported} |
| `default` | 61 | export{local as exported} |
| `id` | 34 | export{local as exported} |
| `provider` | 34 | export{local as exported} |
| `configure` | 33 | export{local as exported} |
| `routes` | 32 | export{local as exported} |
| `imageModel` | 14 | export{local as exported} |
| `route` | 13 | export{local as exported} |
| `responses` | 10 | export{local as exported} |
| `chat` | 9 | export{local as exported} |
| `image` | 9 | export{local as exported} |
| `decisionModel` | 7 | export{local as exported} |
| `responsesModel` | 6 | export{local as exported} |
| `messages` | 5 | export{local as exported} |
| `decision` | 5 | export{local as exported} |
| `make` | 4 | export{local as exported} |
| `Service` | 4 | export{local as exported} |
| `node` | 4 | export{local as exported} |
| `chatModel` | 4 | export{local as exported} |
| `messagesModel` | 3 | export{local as exported} |
| `protocol` | 3 | export{local as exported} |
| `fromIni` | 3 | export{local as exported} |
| `fromContainerMetadata` | 3 | export{local as exported} |
| `fromEnv` | 3 | export{local as exported} |
| `fromHttp` | 3 | export{local as exported} |
| `fromInstanceMetadata` | 3 | export{local as exported} |
| `fromLoginCredentials` | 3 | export{local as exported} |
| `fromProcess` | 3 | export{local as exported} |
| `fromSSO` | 3 | export{local as exported} |
| `fromTokenFile` | 3 | export{local as exported} |
| `fromWebToken` | 3 | export{local as exported} |
| `$Command` | 3 | export{local as exported} |
| `__Client` | 3 | export{local as exported} |
| `errorTypeRegistries` | 3 | export{local as exported} |
| `mergeInput` | 3 | export{local as exported} |
| `as` | 2 | export{bare} |
| `ID` | 2 | export{local as exported} |
| `Info` | 2 | export{local as exported} |
| `createOpenaiCompatible` | 2 | export{local as exported} |
| `video` | 2 | export{local as exported} |
| `imageGeneration` | 2 | export{local as exported} |
| `speech` | 2 | export{local as exported} |
| `transcription` | 2 | export{local as exported} |
| `webSearch` | 2 | export{local as exported} |
| `authEnvVars` | 2 | export{local as exported} |
| `baseURL` | 2 | export{local as exported} |
| `runBaseURL` | 2 | export{local as exported} |
| `AssumeRoleCommand` | 2 | export{local as exported} |
| `STSClient` | 2 | export{local as exported} |
| `createCredentialChain` | 2 | export{local as exported} |
| `fromCognitoIdentity` | 2 | export{local as exported} |
| `fromCognitoIdentityPool` | 2 | export{local as exported} |
| `fromNodeProviderChain` | 2 | export{local as exported} |
| `fromTemporaryCredentials` | 2 | export{local as exported} |
| `propertyProviderChain` | 2 | export{local as exported} |
| `ExpiredTokenException` | 2 | export{local as exported} |
| `ExpiredTokenException$` | 2 | export{local as exported} |
| `AccessDeniedException` | 2 | export{local as exported} |
| `AccessDeniedException$` | 2 | export{local as exported} |
| `InternalServerException` | 2 | export{local as exported} |
| `InternalServerException$` | 2 | export{local as exported} |
| `parseRunModel` | 2 | export{local as exported} |
| `reportRunError` | 2 | export{local as exported} |
| `runNonInteractive` | 2 | export{local as exported} |
| `runNonInteractiveWithOptions` | 2 | export{local as exported} |
| `css` | 2 | export{local as exported} |
| `javascript` | 2 | export{local as exported} |
| `JSErrorCode` | 1 | export{local as exported} |
| `StackFrameIdentifier` | 1 | export{local as exported} |
| `clientURL` | 1 | export{local as exported} |
| `dismissError` | 1 | export{local as exported} |
| `normalizedFilename` | 1 | export{local as exported} |
| `renderFallbackError` | 1 | export{local as exported} |
| `thisCwd` | 1 | export{local as exported} |
| `$$typeof` | 1 | export{local as exported} |
| `__EARLY_RETURN_SENTINEL` | 1 | export{local as exported} |
| `__MEMO_CACHE_SENTINEL` | 1 | export{local as exported} |
| `__callDispose` | 1 | export{local as exported} |
| `__commonJS` | 1 | export{local as exported} |
| `__decorateElement` | 1 | export{local as exported} |
| `__decoratorMetadata` | 1 | export{local as exported} |
| `__decoratorStart` | 1 | export{local as exported} |
| `__esm` | 1 | export{local as exported} |
| `__export` | 1 | export{local as exported} |
| `__exportDefault` | 1 | export{local as exported} |
| `__exportValue` | 1 | export{local as exported} |
| `__jsonParse` | 1 | export{local as exported} |
| `__legacyDecorateClassTS` | 1 | export{local as exported} |
| `__legacyDecorateParamTS` | 1 | export{local as exported} |
| `__legacyMetadataTS` | 1 | export{local as exported} |
| `__merge` | 1 | export{local as exported} |
| `__name` | 1 | export{local as exported} |
| `__privateAdd` | 1 | export{local as exported} |
| `__privateGet` | 1 | export{local as exported} |
| `__privateIn` | 1 | export{local as exported} |
| `__privateMethod` | 1 | export{local as exported} |
| `__privateSet` | 1 | export{local as exported} |
| `__promiseAll` | 1 | export{local as exported} |
| `__publicField` | 1 | export{local as exported} |
| `__reExport` | 1 | export{local as exported} |
| `__runInitializers` | 1 | export{local as exported} |
| `__toCommonJS` | 1 | export{local as exported} |
| `__toESM` | 1 | export{local as exported} |
| `__using` | 1 | export{local as exported} |
| `Card` | 1 | export{bare} |
| `CardAction` | 1 | export{bare} |
| `CardContent` | 1 | export{bare} |
| `CardDescription` | 1 | export{bare} |
| `CardFooter` | 1 | export{bare} |
| `CardHeader` | 1 | export{bare} |
| `CardTitle` | 1 | export{bare} |
| `Label` | 1 | export{bare} |
| `Button` | 1 | export{bare} |
| `buttonVariants` | 1 | export{bare} |
| `Select` | 1 | export{bare} |
| `SelectContent` | 1 | export{bare} |
| `SelectGroup` | 1 | export{bare} |
| `SelectItem` | 1 | export{bare} |
| `SelectLabel` | 1 | export{bare} |
| `SelectScrollDownButton` | 1 | export{bare} |
| `SelectScrollUpButton` | 1 | export{bare} |
| `SelectSeparator` | 1 | export{bare} |
| `SelectTrigger` | 1 | export{bare} |
| `SelectValue` | 1 | export{bare} |
| `Input` | 1 | export{bare} |
| `Textarea` | 1 | export{bare} |
| `a` | 1 | export{local as exported} |
| `b` | 1 | export{local as exported} |
| `c` | 1 | export{local as exported} |
| `d` | 1 | export{local as exported} |
| `e` | 1 | export{local as exported} |
| `f` | 1 | export{local as exported} |
| `g` | 1 | export{local as exported} |
| `h` | 1 | export{local as exported} |
| `i` | 1 | export{local as exported} |
| `j` | 1 | export{local as exported} |
| `k` | 1 | export{local as exported} |
| `l` | 1 | export{local as exported} |
| `m` | 1 | export{local as exported} |
| `n` | 1 | export{local as exported} |
| `o` | 1 | export{local as exported} |
| `p` | 1 | export{local as exported} |
| `q` | 1 | export{local as exported} |
| `r` | 1 | export{local as exported} |
| `s` | 1 | export{local as exported} |
| `t` | 1 | export{local as exported} |
| `u` | 1 | export{local as exported} |
| `v` | 1 | export{local as exported} |
| `w` | 1 | export{local as exported} |
| `x` | 1 | export{local as exported} |
| `y` | 1 | export{local as exported} |
| `z` | 1 | export{local as exported} |
| `A` | 1 | export{local as exported} |
| `B` | 1 | export{local as exported} |
| `C` | 1 | export{local as exported} |
| `D` | 1 | export{local as exported} |
| `E` | 1 | export{local as exported} |
| `F` | 1 | export{local as exported} |
| `G` | 1 | export{local as exported} |
| `H` | 1 | export{local as exported} |
| `I` | 1 | export{local as exported} |
| `J` | 1 | export{local as exported} |
| `K` | 1 | export{local as exported} |
| `L` | 1 | export{local as exported} |
| `M` | 1 | export{local as exported} |
| `N` | 1 | export{local as exported} |
| `O` | 1 | export{local as exported} |
| `P` | 1 | export{local as exported} |
| `Q` | 1 | export{local as exported} |
| `R` | 1 | export{local as exported} |
| `S` | 1 | export{local as exported} |
| `T` | 1 | export{local as exported} |
| `U` | 1 | export{local as exported} |
| `V` | 1 | export{local as exported} |
| `W` | 1 | export{local as exported} |
| `X` | 1 | export{local as exported} |
| `Y` | 1 | export{local as exported} |
| `Z` | 1 | export{local as exported} |
| `_` | 1 | export{local as exported} |
| `$` | 1 | export{local as exported} |
| `aa` | 1 | export{local as exported} |
| `ba` | 1 | export{local as exported} |
| `ca` | 1 | export{local as exported} |
| `da` | 1 | export{local as exported} |
| `ea` | 1 | export{local as exported} |
| `fa` | 1 | export{local as exported} |
| `ga` | 1 | export{local as exported} |
| `ha` | 1 | export{local as exported} |
| `ia` | 1 | export{local as exported} |
| `ja` | 1 | export{local as exported} |
| `ka` | 1 | export{local as exported} |
| `la` | 1 | export{local as exported} |
| `ma` | 1 | export{local as exported} |
| `na` | 1 | export{local as exported} |
| `oa` | 1 | export{local as exported} |
| `pa` | 1 | export{local as exported} |
| `qa` | 1 | export{local as exported} |
| `ra` | 1 | export{local as exported} |
| `sa` | 1 | export{local as exported} |
| `ta` | 1 | export{local as exported} |
| `ua` | 1 | export{local as exported} |
| `va` | 1 | export{local as exported} |
| `wa` | 1 | export{local as exported} |
| `xa` | 1 | export{local as exported} |
| `ya` | 1 | export{local as exported} |
| `za` | 1 | export{local as exported} |
| `Aa` | 1 | export{local as exported} |
| `Ba` | 1 | export{local as exported} |
| `Ca` | 1 | export{local as exported} |
| `Da` | 1 | export{local as exported} |
| `Ea` | 1 | export{local as exported} |
| `Fa` | 1 | export{local as exported} |
| `Ga` | 1 | export{local as exported} |
| `Ha` | 1 | export{local as exported} |
| `Ia` | 1 | export{local as exported} |
| `Ja` | 1 | export{local as exported} |
| `Ka` | 1 | export{local as exported} |
| `La` | 1 | export{local as exported} |
| `Ma` | 1 | export{local as exported} |
| `Na` | 1 | export{local as exported} |
| `Oa` | 1 | export{local as exported} |
| `Pa` | 1 | export{local as exported} |
| `Qa` | 1 | export{local as exported} |
| `Ra` | 1 | export{local as exported} |
| `Sa` | 1 | export{local as exported} |
| `Ta` | 1 | export{local as exported} |
| `Ua` | 1 | export{local as exported} |
| `Va` | 1 | export{local as exported} |
| `Wa` | 1 | export{local as exported} |
| `Xa` | 1 | export{local as exported} |
| `Ya` | 1 | export{local as exported} |
| `Za` | 1 | export{local as exported} |
| `_a` | 1 | export{local as exported} |
| `$a` | 1 | export{local as exported} |
| `ab` | 1 | export{local as exported} |
| `bb` | 1 | export{local as exported} |
| `cb` | 1 | export{local as exported} |
| `db` | 1 | export{local as exported} |
| `eb` | 1 | export{local as exported} |
| `fb` | 1 | export{local as exported} |
| `gb` | 1 | export{local as exported} |
| `hb` | 1 | export{local as exported} |
| `ib` | 1 | export{local as exported} |
| `jb` | 1 | export{local as exported} |
| `kb` | 1 | export{local as exported} |
| `lb` | 1 | export{local as exported} |
| `mb` | 1 | export{local as exported} |
| `nb` | 1 | export{local as exported} |
| `ob` | 1 | export{local as exported} |
| `pb` | 1 | export{local as exported} |
