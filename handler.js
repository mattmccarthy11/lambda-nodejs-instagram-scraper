'use strict';

const https = require('https');

module.exports.stats =  (event, context, callback) => {
  const username = event.queryStringParameters.user;

   userStatsIG(username, callback);
};

const userStatsIG =  async (username, call_back) => {
   await https.get(`https://www.instagram.com/${username}/`,  async (resp) => {
    let data = '';
    resp.on('data', (chunk) => {
      data += chunk;
    });

     await resp.on('end', () => {
       call_back(null, {
        statusCode: 200,
        body: JSON.stringify({
          message: `Sucessfully fetch ig user ${username}`,
          body:  parseUserIG(username, scrape(data) ) 
        })
      });
    });
  }).on("error", (err) => {
    console.log("Error: " + err.message);
       call_back(null, {
        statusCode: 500,
        body: JSON.stringify({
          message: `Unable to fetch ig user ${username}`,
          body: err
        })
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
        username : username
      };
      let medias = [];
      edges.forEach( post => {
        if(post.node.__typename === 'GraphImage') {
          medias.push(scrapePostData(post) )
        }
      });
      userStats.medias = medias;
      return userStats;
  }else {
    new Error('Error scraping user page "' + username + '"');
  }
}

const dataExp = /window\._sharedData\s?=\s?({.+);<\/script>/;

const scrape = html =>  {
  try {
    return JSON.parse(html.match(dataExp)[1] );
  }catch(e) {
    if (process.env.NODE_ENV != 'production') {
      console.error('The HTML returned from instagram was not suitable for scraping');
    }
    return null
  }
}

const scrapePostData = post => {
  return {
    media_id : post.node.id,
    shortcode : post.node.shortcode,
    text : post.node.edge_media_to_caption.edges[0] && post.node.edge_media_to_caption.edges[0].node.text,
    comment_count : post.node.edge_media_to_comment.count,
    like_count : post.node.edge_liked_by.count,
    display_url : post.node.display_url,
    owner_id : post.node.owner.id,
    date : post.node.taken_at_timestamp,
    thumbnail : post.node.thumbnail_src,
    thumbnail_resource : post.node.thumbnail_resources
  }
}
