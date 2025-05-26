## mongodb sort 排序

```text
var order = [ "David", "Charlie", "Tess" ];
```

```text
var query = [
             {$match: {name: {$in: order}}},
             {$addFields: {"__order": {$indexOfArray: [order, "$name" ]}}},
             {$sort: {"__order": 1}}
            ];

var result = db.users.aggregate(query);
```