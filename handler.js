'use strict';

const https = require('https');

module.exports.stats = (event, context, callback) => {
  const username = event.queryStringParameters.user;
  myIP();
  userStatsIG(username, callback);
};

const myIP =   async () => {
  https.get('https://ifconfig.me', (resp) => {
    let data = '';
    resp.on('data', chunk => data += chunk );
    resp.on('end', () => console.log("myIP:"+data) );
  }).on("error", (err) => {
    console.log("myIP Err: " + err.message);
  });
};

const userStatsIG =   (username, call_back) => {
  https.get(`https://www.instagram.com/${username}/`, (resp) => {
    let data = '';
    resp.on('data', chunk => data += chunk);
    resp.on('end', () => {
      call_back(null, {
        statusCode: 200,
        body: JSON.stringify(parseUserIG(username, scrape(data) ))
      });
    });
  }).on("error", (err) => {
    console.log("userStatsIG Err: " + err.message);
    call_back(null, {
      statusCode: 500,
      body: JSON.stringify(err)
    });
  });
};

const parseUserIG = (username, userJson) => {
  if ( userJson &&
    userJson.entry_data && 
    userJson.entry_data.ProfilePage && 
    userJson.entry_data.ProfilePage[0] && 
    userJson.entry_data.ProfilePage[0].graphql && 
    userJson.entry_data.ProfilePage[0].graphql.user && 
    userJson.entry_data.ProfilePage[0].graphql.user.edge_owner_to_timeline_media &&
    userJson.entry_data.ProfilePage[0].graphql.user.edge_owner_to_timeline_media.count > 0 &&
    userJson.entry_data.ProfilePage[0].graphql.user.edge_owner_to_timeline_media.edges) {
      const edges =  userJson.entry_data.ProfilePage[0].graphql.user.edge_owner_to_timeline_media.edges;
      let userStats = {
        username : username,
        followers : userJson.entry_data.ProfilePage[0].graphql.user.edge_followed_by.count,
        total_media_count : userJson.entry_data.ProfilePage[0].graphql.user.edge_owner_to_timeline_media.count
      };
      let medias = [];
      edges.forEach( post => medias.push(scrapePostData(post) ) );
      return {...userStats, ...parseStatFromMedias(medias)};
  }else {
    new Error('Error scraping user page "' + username + '"');
  }
};

const dataExp = /window\._sharedData\s?=\s?({.+);<\/script>/;

const scrape = html =>  {
  try {
    return JSON.parse(html.match(dataExp)[1] );
  }catch(e) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('The HTML returned from instagram was not suitable for scraping');
    }
    return null;
  }
};

const scrapePostData = post => {
  return {
    media_id : post.node.id,
    shortcode : post.node.shortcode,
    text : post.node.edge_media_to_caption.edges[0] && post.node.edge_media_to_caption.edges[0].node.text,
    comment_count : post.node.edge_media_to_comment.count,
    like_count : post.node.edge_liked_by.count,
    view_count : post.node.is_video && post.node.video_view_count,
    display_url : post.node.display_url,
    owner_id : post.node.owner.id,
    date : post.node.taken_at_timestamp,
    thumbnail : post.node.thumbnail_src
//    ,thumbnail_resource : post.node.thumbnail_resources
  };
};

const parseStatFromMedias = medias => {
  let stats = {
    image_count: 0,
    image_engagemets: 0,
    video_count: 0,
    video_engagemets: 0
  };
  medias.forEach( post => {
    let eng = post.comment_count + post.like_count;
    if(post.view_count){
      stats.video_count++;
      stats.video_engagemets += eng + post.view_count;
    }else{
      stats.image_count++;
      stats.image_engagemets += eng;
    }
  });
  return stats;
};