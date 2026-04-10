# -*- coding: utf-8 -*-
try:
    from qcloud_cos import CosConfig, CosS3Client
except ImportError:
    print('需要安装: pip install cos-python-sdk-v5')
    exit(1)

secret_id  = 'AKIDSny0tdD2ynVQErHUWj1LYaP1Zu35wa1E'
secret_key = 'PddR2QbbUTZkqodHuPjqlkbHl3A6SRGs'
region     = 'ap-beijing'
bucket     = 'baiyou-1419593132'
local_file = r'C:\Users\surface\WorkBuddy\Claw\finance-tool-v6\index.html'

print('配置COS...')
config  = CosConfig(Region=region, SecretId=secret_id, SecretKey=secret_key)
client  = CosS3Client(config)

# 清理旧文件
print('清理旧文件...')
for key in ['index.html', 'tool.html']:
    try:
        client.delete_object(Bucket=bucket, Key=key)
        print('  删除: ' + key)
    except Exception as e:
        print('  ' + key + ': ' + str(e))

# 上传新文件
print('上传 v6...')
client.upload_file(Bucket=bucket, LocalFilePath=local_file, Key='index.html')
client.put_object_acl(Bucket=bucket, Key='index.html', ACL='public-read')

print('')
print('=' * 50)
print('上传成功!')
print('线上地址: http://baiyou-1419593132.cos-website.ap-beijing.myqcloud.com/')
print('=' * 50)
