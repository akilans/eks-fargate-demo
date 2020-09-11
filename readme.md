# AWS EKS Fargate Demo
With AWS Fargate, you no longer have to provision, configure, or scale groups of virtual machines to run containers

### Limitations
* Not available in all regions
* Pods running on Fargate are only supported on private subnets
* Fargate profiles must be configured with namespace to run pods
* Daemonsets are not supported on Fargate
* Classic Load Balancers and Network Load Balancers are not supported on pods running on Fargate.We need to use ALB ingress controller
* Statefull application was not possible to run in EKS fargate- But now EFS volume supported [Just 20 days back]
* EFS volume [ Newly created cluster with 1.17 version]
* If you do not specify a vCPU and memory combination, then the smallest available combination is used (.25 vCPU and 0.5 GB memory).
* Maximum cpu 4 and memory 30 GB

### Reference Link
* [AWS EKS Fargate Documentation](https://docs.aws.amazon.com/eks/latest/userguide/fargate.html)
* [AWS EKS Fargate - EFS support](https://aws.amazon.com/blogs/aws/new-aws-fargate-for-amazon-eks-now-supports-amazon-efs/)
* [ALB ingress controller Documentation](https://docs.aws.amazon.com/eks/latest/userguide/alb-ingress.html)

### Prerequisite

* Install AWS cli and configure 
* Install eksctl
* Install kubectl

### Application Diagram

![API - WEB - BLOG ](https://github.com/akilans/eks-fargate-demo/blob/master/web-api-blog.png?raw=true)

### Cluster Creation using eksctl
``` bash
eksctl create cluster --name eks-demo --version 1.17 --fargate
```
* Advantages of creating cluster using eksctl
  * creates VPC, subnets, SG etc
  * Creates pod execution role [pods need to make calls to AWS APIs on your behalf to do things like pull container images from Amazon ECR]
  * Creates fargate profiles for default and kube-system namespaces
  * Tagging public and private subnets to support ALB ingress controller

### Create API, Blog images and test locally
Run from api folder
``` bash
docker image build -t akilan/node-api:1 .
# test locally
docker container run -d --name node-api -p 5000:3000 akilan/node-api:1
# Access http://localhost:5000
# Push it to docker hub
docker push akilan/node-api:1
```

Run from blog folder
``` bash
docker image build -t akilan/node-blog:1 .
# test locally
docker container run -d --name node-blog -p 4000:3000 akilan/node-blog:1
# Access http://localhost:4000
# Push it to docker hub
docker push akilan/node-blog:1

```

### Deploy Web, API and Blog in EKS Fargate
``` bash
kubectl apply -f k8s/api-blog-web/
```

### Deploy Ingress Controller and Ingress
Install Ingress Controller

``` bash
# Create an IAM OIDC provider and associate it with your cluster.
eksctl utils associate-iam-oidc-provider \
    --region us-east-2 \
    --cluster eks-demo \
    --approve

# Download IAM policy for ALB ingress controller and create. Need for create/delete/edit ALB and manage EC2
curl -o iam-policy.json https://raw.githubusercontent.com/kubernetes-sigs/aws-alb-ingress-controller/v1.1.8/docs/examples/iam-policy.json

aws iam create-policy \
    --policy-name ALBIngressControllerIAMPolicy \
    --policy-document file://iam-policy.json

# Create serviceaccount for ALB and assign cluster level access
kubectl apply -f https://raw.githubusercontent.com/kubernetes-sigs/aws-alb-ingress-controller/v1.1.8/docs/examples/rbac-role.yaml

# Create IAM role and attach the previous policy and map it to the previous serviceaccount

eksctl create iamserviceaccount \
    --region us-east-2 \
    --name alb-ingress-controller \
    --namespace kube-system \
    --cluster eks-demo \
    --attach-policy-arn arn:aws:iam::839927957243:policy/ALBIngressControllerIAMPolicy \
    --override-existing-serviceaccounts \
    --approve

# Deploy ALB ingress contoller
kubectl apply -f https://raw.githubusercontent.com/kubernetes-sigs/aws-alb-ingress-controller/v1.1.8/docs/examples/alb-ingress-controller.yaml

kubectl edit deployment.apps/alb-ingress-controller -n kube-system

# Deploy Ingress
kubectl apply -f k8s/ingress/ingress.yaml

```

### EFS - Persistent Storage
``` bash
kubectl apply -f k8s/EFS/efs.yaml
# Create EFS volume and configure SG
# Update EFS id in pv-pvc.yaml
kubectl apply -f k8s/EFS/pv-pvc.yaml
kubectl apply -f k8s/EFS/web-dep-pv.yaml
```