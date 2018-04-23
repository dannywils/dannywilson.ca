module.exports = {
  siteMetadata: {
    title: 'Danny Wilson',
    subtitle: 'Software Developer in Halifax, Nova Scotia'
  },
  plugins: [
    'gatsby-plugin-react-helmet',
    'gatsby-plugin-sass',
    {
      resolve: `gatsby-plugin-manifest`,
      options: {
        name: 'Danny Wilson',
        short_name: 'Danny Wilson',
        start_url: '/',
        background_color: '#3273DC',
        theme_color: '#209CEE',
        display: 'minimal-ui'
      }
    },
    {
      resolve: `gatsby-plugin-google-analytics`,
      options: {
        trackingId: 'UA-39372803-1',
        head: false,
        anonymize: true,
        respectDNT: true
      }
    }
  ]
};
