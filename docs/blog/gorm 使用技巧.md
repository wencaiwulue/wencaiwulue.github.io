## 设置字符集

默认 mysql utf8 字符集应该是 utf8_general_ci 的，这个 ci 的含义是 case-insensitive 也就是大小写不敏感的

```shell
mysql> SHOW CHARACTER SET;
+----------+---------------------------------+---------------------+--------+
| Charset  | Description                     | Default collation   | Maxlen |
+----------+---------------------------------+---------------------+--------+
| armscii8 | ARMSCII-8 Armenian              | armscii8_general_ci |      1 |
| ascii    | US ASCII                        | ascii_general_ci    |      1 |
| big5     | Big5 Traditional Chinese        | big5_chinese_ci     |      2 |
| binary   | Binary pseudo charset           | binary              |      1 |
| cp1250   | Windows Central European        | cp1250_general_ci   |      1 |
| cp1251   | Windows Cyrillic                | cp1251_general_ci   |      1 |
| cp1256   | Windows Arabic                  | cp1256_general_ci   |      1 |
| cp1257   | Windows Baltic                  | cp1257_general_ci   |      1 |
| cp850    | DOS West European               | cp850_general_ci    |      1 |
| cp852    | DOS Central European            | cp852_general_ci    |      1 |
| cp866    | DOS Russian                     | cp866_general_ci    |      1 |
| cp932    | SJIS for Windows Japanese       | cp932_japanese_ci   |      2 |
| dec8     | DEC West European               | dec8_swedish_ci     |      1 |
| eucjpms  | UJIS for Windows Japanese       | eucjpms_japanese_ci |      3 |
| euckr    | EUC-KR Korean                   | euckr_korean_ci     |      2 |
| gb18030  | China National Standard GB18030 | gb18030_chinese_ci  |      4 |
| gb2312   | GB2312 Simplified Chinese       | gb2312_chinese_ci   |      2 |
| gbk      | GBK Simplified Chinese          | gbk_chinese_ci      |      2 |
| geostd8  | GEOSTD8 Georgian                | geostd8_general_ci  |      1 |
| greek    | ISO 8859-7 Greek                | greek_general_ci    |      1 |
| hebrew   | ISO 8859-8 Hebrew               | hebrew_general_ci   |      1 |
| hp8      | HP West European                | hp8_english_ci      |      1 |
| keybcs2  | DOS Kamenicky Czech-Slovak      | keybcs2_general_ci  |      1 |
| koi8r    | KOI8-R Relcom Russian           | koi8r_general_ci    |      1 |
| koi8u    | KOI8-U Ukrainian                | koi8u_general_ci    |      1 |
| latin1   | cp1252 West European            | latin1_swedish_ci   |      1 |
| latin2   | ISO 8859-2 Central European     | latin2_general_ci   |      1 |
| latin5   | ISO 8859-9 Turkish              | latin5_turkish_ci   |      1 |
| latin7   | ISO 8859-13 Baltic              | latin7_general_ci   |      1 |
| macce    | Mac Central European            | macce_general_ci    |      1 |
| macroman | Mac West European               | macroman_general_ci |      1 |
| sjis     | Shift-JIS Japanese              | sjis_japanese_ci    |      2 |
| swe7     | 7bit Swedish                    | swe7_swedish_ci     |      1 |
| tis620   | TIS620 Thai                     | tis620_thai_ci      |      1 |
| ucs2     | UCS-2 Unicode                   | ucs2_general_ci     |      2 |
| ujis     | EUC-JP Japanese                 | ujis_japanese_ci    |      3 |
| utf16    | UTF-16 Unicode                  | utf16_general_ci    |      4 |
| utf16le  | UTF-16LE Unicode                | utf16le_general_ci  |      4 |
| utf32    | UTF-32 Unicode                  | utf32_general_ci    |      4 |
| utf8mb3  | UTF-8 Unicode                   | utf8mb3_general_ci  |      3 |
| utf8mb4  | UTF-8 Unicode                   | utf8mb4_0900_ai_ci  |      4 |
+----------+---------------------------------+---------------------+--------+
41 rows in set (0.00 sec)
```

也就是说查询大写 A 的时候，会返回 a, 因为大小写不敏感，如果做了 unique ，那么写入 a 和 A 会冲突，认为已经存在了

```shell
mysql> select * from workflow where name = 'A';
+-----------------------+------+-----------------------+-------------+-----------------------+-------------------------+-------------------------+------------+
| id                    | name | workspace_id          | description | latest_version        | created_at              | updated_at              | deleted_at |
+-----------------------+------+-----------------------+-------------+-----------------------+-------------------------+-------------------------+------------+
| fchsq38p25g8c738i5bq0 | a    | wchnd35cfpt0c73dhe4fg |             | vchsq38p25g8c738i5bqg | 2023-06-02 08:00:35.957 | 2023-06-02 08:00:42.279 | NULL       |
+-----------------------+------+-----------------------+-------------+-----------------------+-------------------------+-------------------------+------------+
1 row in set (0.00 sec)

```

使用 grom 可以用 gorm tag 解决

```txt
Name          string `gorm:"type:varchar(200) CHARACTER SET gbk COLLATE gbk_bin;not null;uniqueIndex:idx_name_ws"`
WorkspaceID   string `gorm:"type:varchar(32);uniqueIndex:idx_name_ws"`
```

原生 sql 的话，也可以通过 sql tag 解决

```shell
type User struct {
    Name `sql:"type:VARCHAR(5) CHARACTER SET utf8 COLLATE utf8_bin"`
}
```

## 设置联合索引

在两个字段上使用相同的 index name，例如

```shell
Name          string `gorm:"type:varchar(200) CHARACTER SET gbk COLLATE gbk_bin;not null;uniqueIndex:idx_name_ws"`
WorkspaceID   string `gorm:"type:varchar(32);uniqueIndex:idx_name_ws"`
```

## 设置虚拟列

mysql 不支持对 null 做唯一索引
在大多数场景下没有问题，但是如果有软删除的话，就会有问题

常用的解决方案

- deleted_at 字段使用 timestamp 根源解决，查询的时候 deleted_at != 0 || deleted_at > 0 就好啦
- 加虚拟列, 更新的时候，也是生效的

```mysql
ALTER TABLE `workflow`
    ADD COLUMN `not_deleted` BOOLEAN GENERATED ALWAYS AS (IF(`deleted_at` IS NULL, TRUE, NULL)) VIRTUAL;
```

```mysql
ALTER TABLE `workflow`
    ADD CONSTRAINT `unique_name` UNIQUE (`name`, `not_deleted`);
```