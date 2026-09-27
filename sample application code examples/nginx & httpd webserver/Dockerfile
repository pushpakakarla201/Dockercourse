# nginx sample dockerfile
FROM nginx
EXPOSE 80
MAINTAINER pushpa
LABEL this is our nginx image
COPY index.html /usr/local/nginx/html/

# httpd dockerfile
FROM httpd
EXPOSE 80
MAINTAINER pushpa
LABEL this is our httpd image
COPY index.html /usr/local/apache2/htdocs/
