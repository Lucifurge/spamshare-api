{
    "version": 2,
    "builds": [
      {
        "src": "share.js",
        "use": "@vercel/node"
      }
    ],
    "routes": [
      {
        "src": "/share",
        "dest": "/share.js"
      }
    ]
  }
      
