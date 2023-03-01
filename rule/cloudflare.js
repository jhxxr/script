export default {
    async fetch(request, env) {
        url='https://rule.jhxxrs.site/sub?target=clash&new_name=true&url=https%3A%2F%2Fsanfen002.xyz%2Fapi%2Fv1%2Fclient%2Fsubscribe%3Ftoken%3Dcbc1b1fc4a299ba836a3ba7b8e36054b%26flag%3Dclash%7Chttps%3A%2F%2Flink.msclm.net%2Fapi%2Fv1%2Fclient%2Fsubscribe%3Ftoken%3D27c730e15d4adf05d7a853de1c7bbcef%7Chttps%3A%2F%2Ffast.lycorisrecoil.org%2Flink%2FjuiduSlxT6HWcruQ%3Fsub%3D1%7Chttps%3A%2F%2Fapiv2.lipulai.com%2Fapi_version2%2Fqdaulnmn0mog2789%3Fclash%3D1%26extend%3D1&insert=false&config=https%3A%2F%2Fraw.githubusercontent.com%2Fjhxxr%2Fscript%2Fmaster%2Frule%2Fxr_all_config.ini&exclude=%E5%A5%97%E9%A4%90%E5%88%B0%E6%9C%9F%7C%E5%89%A9%E4%BD%99%E6%B5%81%E9%87%8F%7C%E7%BD%91%E6%98%93%E4%BA%91%7C%E5%AE%98%E7%BD%91%7C%E4%BA%8C%E6%89%8B%E5%80%92%E5%8D%96%7C%E9%87%8D%E7%BD%AE%7C%E5%89%A9%E4%BD%99%7C%E8%BF%87%E6%9C%9F%7C%E4%B8%89%E5%88%86%E6%9C%BA%E5%9C%BA%7C%E5%88%B0%E6%9C%9F%7C%E8%AE%A2%E9%98%85append_type=true&emoji=true&list=false&tfo=false&scv=false&fdn=false&sort=true&udp=true'
        let response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'zh-cn',
                'Accept-Encoding': 'gzip, deflate',
                'Connection': 'keep-alive',
                'Host': 'rule.jhxxrs.site',
                'Referer': 'https://www.cloudflare.com/',  
            }
        })
        let body = await response.text()
        //输出
        return new Response(body, {
            headers: {
                'Content-Type': 'application/x-yaml',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With'
            }
        })
        
    }
  }
//定时任务
