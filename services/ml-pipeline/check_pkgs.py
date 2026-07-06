pkgs = ['polars', 'xgboost', 'optuna', 'pyarrow']
for p in pkgs:
    try:
        m = __import__(p)
        v = getattr(m, '__version__', 'installed')
        print(f'OK      {p} == {v}')
    except ImportError:
        print(f'MISSING {p}')
