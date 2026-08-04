<?php

namespace App\Http\Controllers;

use App\Jobs\OrderSyncJob;
use App\Repositories\Order\OrderRepositoryInterface;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    protected $OrderRepository;

    public function __construct(OrderRepositoryInterface $OrderRepository)
    {
        $this->OrderRepository = $OrderRepository;
    }

    public function index()
    {
        OrderSyncJob::dispatch(auth()->user()->id);

        return $this->render('Dashboard');
    }

    public function orderSeacrhfilter(Request $request)
    {
        $filters = $request->all();
        $filters['relation'] = [
            'orderCustomer',
            'OrderFulfillments',
            'OrderLineItems',
            'OrderLineItems.designCartItem:id,public_id,status,summary',
            'OrderShippingAddress',
        ];

        $filters['financial_status'] = $request->financial_status;
        $filters['fulfillment_status'] = $request->fulfillment_status;

        return $this->OrderRepository->SearchFilter($filters);
    }
}
